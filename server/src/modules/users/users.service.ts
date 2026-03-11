import prisma from "../../db/client";
import { AppError } from "../../common/errors/app-error";
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  AssignTagsDto,
  AssignChatsDto,
} from "./users.schema";
import { Prisma, UserStatus } from "@prisma/client";
import { telegramBot, buildInlineKeyboard, TelegramApiError } from "../../lib/telegram-bot";

// ──────────────────────────────────────────────────────────────────────────────
// Onboarding: создать инвайт-ссылки и отправить сотруднику в ЛС
// ──────────────────────────────────────────────────────────────────────────────
async function triggerOnboarding(
  userId: string,
  userTelegramId: bigint,
  botStarted: boolean,
  chatIds: string[],
) {
  if (chatIds.length === 0) return;

  // Получаем данные чатов
  const chats = await prisma.chat.findMany({
    where: { id: { in: chatIds }, isActive: true, canInvite: true },
  });

  if (chats.length === 0) {
    console.warn(`[Onboarding] No chats with canInvite=true for user ${userId}`);
    return;
  }

  // Expire через 7 дней
  const expireDate = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const inviteLinks: { chatTitle: string; link: string }[] = [];

  for (const chat of chats) {
    try {
      const result = await telegramBot.createChatInviteLink(
        Number(chat.telegramId),
        { expireDate, memberLimit: 1, name: `Onboarding-${userId.slice(0, 8)}` },
      );

      await prisma.inviteLink.create({
        data: {
          userId,
          chatId: chat.id,
          link: result.invite_link,
          expiresAt: new Date(expireDate * 1000),
        },
      });

      inviteLinks.push({ chatTitle: chat.title, link: result.invite_link });
      console.log(`[Onboarding] Invite link created for chat "${chat.title}"`);
    } catch (err) {
      console.error(`[Onboarding] Failed to create invite for chat "${chat.title}":`, err);
    }
  }

  if (inviteLinks.length === 0) return;

  // Отправляем DM только если пользователь уже нажал /start
  if (!botStarted) {
    console.log(`[Onboarding] User ${userId} hasn't started the bot yet — links saved for later`);
    return;
  }

  await sendInviteLinksToUser(Number(userTelegramId), inviteLinks);
}

/**
 * Отправить накопленные инвайт-ссылки пользователю в личку
 */
export async function sendInviteLinksToUser(
  telegramId: number,
  links: { chatTitle: string; link: string }[],
) {
  if (links.length === 0) return;

  const buttons = links.map(({ chatTitle, link }) => ({
    text: `Вступить: ${chatTitle}`,
    url: link,
  }));

  try {
    await telegramBot.sendMessage(
      telegramId,
      `👋 <b>Добро пожаловать!</b>\n\nВам открыт доступ к корпоративным чатам. Нажмите на кнопки ниже, чтобы вступить:`,
      {
        parse_mode: "HTML",
        reply_markup: buildInlineKeyboard(buttons),
      },
    );
    console.log(`[Onboarding] DM sent to user ${telegramId} with ${links.length} invite links`);
  } catch (err) {
    console.error(`[Onboarding] Failed to send DM to user ${telegramId}:`, err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Offboarding: физически удалить из всех Telegram-чатов
// ──────────────────────────────────────────────────────────────────────────────
async function kickFromAllChats(
  userTelegramId: bigint,
  memberships: Array<{ chatId: string; chat: { telegramId: bigint; botIsAdmin: boolean; canBan: boolean; title: string } }>,
) {
  const tgUserId = Number(userTelegramId);

  const results = await Promise.allSettled(
    memberships
      .filter((m) => m.chat.botIsAdmin && m.chat.canBan)
      .map(async (m) => {
        const tgChatId = Number(m.chat.telegramId);
        await telegramBot.banChatMember(tgChatId, tgUserId);
        console.log(`[Offboarding] Banned user ${tgUserId} from chat "${m.chat.title}"`);
      }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    failed.forEach((r) => {
      if (r.status === "rejected") {
        console.error(`[Offboarding] Ban failed:`, r.reason);
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────
class UsersService {
  async create(dto: CreateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { telegramId: BigInt(dto.telegramId) },
    });

    if (existing) {
      throw AppError.conflict("User with this Telegram ID already exists");
    }

    const user = await prisma.user.create({
      data: {
        telegramId: BigInt(dto.telegramId),
        username: dto.username,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        department: dto.department,
        position: dto.position,
        status: "PENDING",
        tags: dto.tagIds
          ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Если указан пакет чатов — создаём membership'ы и запускаем онбординг
    if (dto.chatPackageId) {
      const packageChats = await prisma.chatPackageItem.findMany({
        where: { packageId: dto.chatPackageId },
        select: { chatId: true },
      });

      if (packageChats.length > 0) {
        await prisma.chatMembership.createMany({
          data: packageChats.map((pc) => ({
            userId: user.id,
            chatId: pc.chatId,
            status: "PENDING_INVITE",
          })),
          skipDuplicates: true,
        });

        // Асинхронный онбординг — не блокируем ответ
        triggerOnboarding(
          user.id,
          user.telegramId,
          user.botStarted,
          packageChats.map((pc) => pc.chatId),
        ).catch((err) => console.error("[Onboarding] Unhandled error:", err));
      }
    }

    return this.serializeUser(user);
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, search, searchField, status, tagId, department } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      if (searchField === "username") {
        where.username = { contains: search, mode: "insensitive" };
      } else if (searchField === "phone") {
        where.phone = { contains: search };
      } else if (searchField === "name") {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ];
      } else {
        where.OR = [
          { username: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ];
      }
    }

    if (status) where.status = status;
    if (tagId) where.tags = { some: { tagId } };
    if (department) where.department = { contains: department, mode: "insensitive" };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tags: { include: { tag: true } },
          chatMemberships: {
            include: { chat: { select: { id: true, title: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.serializeUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        chatMemberships: { include: { chat: true } },
      },
    });

    if (!user) throw AppError.notFound("User not found");

    return this.serializeUser(user);
  }

  async findByTelegramId(telegramId: bigint) {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { tags: { include: { tag: true } } },
    });

    if (!user) throw AppError.notFound("User not found");

    return this.serializeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await prisma.user.update({
      where: { id },
      data: dto,
      include: { tags: { include: { tag: true } } },
    });

    return this.serializeUser(user);
  }

  async assignTags(userId: string, dto: AssignTagsDto) {
    await prisma.$transaction([
      prisma.userTag.deleteMany({ where: { userId } }),
      prisma.userTag.createMany({
        data: dto.tagIds.map((tagId) => ({ userId, tagId })),
      }),
    ]);

    return this.findById(userId);
  }

  async addTags(userId: string, tagIds: string[]) {
    await prisma.userTag.createMany({
      data: tagIds.map((tagId) => ({ userId, tagId })),
      skipDuplicates: true,
    });

    return this.findById(userId);
  }

  async removeTags(userId: string, tagIds: string[]) {
    await prisma.userTag.deleteMany({
      where: { userId, tagId: { in: tagIds } },
    });

    return this.findById(userId);
  }

  async assignChats(userId: string, dto: AssignChatsDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, botStarted: true },
    });

    if (!user) throw AppError.notFound("User not found");

    await prisma.chatMembership.createMany({
      data: dto.chatIds.map((chatId) => ({
        userId,
        chatId,
        status: "PENDING_INVITE",
      })),
      skipDuplicates: true,
    });

    // Запускаем онбординг для новых чатов
    triggerOnboarding(userId, user.telegramId, user.botStarted, dto.chatIds).catch((err) =>
      console.error("[Onboarding] Unhandled error:", err),
    );

    return this.findById(userId);
  }

  // ──────────────────────────────────────────────
  // Offboarding: блокировка сотрудника
  // ──────────────────────────────────────────────
  async block(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        chatMemberships: {
          where: { status: "ACTIVE" },
          include: {
            chat: {
              select: {
                telegramId: true,
                botIsAdmin: true,
                canBan: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw AppError.notFound("User not found");

    // 1. Обновляем БД атомарно
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { status: "BLOCKED", blockedAt: new Date() },
      }),
      prisma.chatMembership.updateMany({
        where: { userId: id },
        data: { status: "KICKED", leftAt: new Date() },
      }),
      prisma.userTag.deleteMany({ where: { userId: id } }),
    ]);

    // 2. Физически кикаем из Telegram-чатов (асинхронно)
    if (user.chatMemberships.length > 0) {
      kickFromAllChats(user.telegramId, user.chatMemberships).catch((err) =>
        console.error("[Offboarding] Unhandled error:", err),
      );
    }

    return { message: "User blocked successfully" };
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) throw AppError.notFound("User not found");
    if (user.status !== "BLOCKED") {
      throw AppError.badRequest("Only blocked users can be deleted");
    }

    await prisma.user.delete({ where: { id } });

    return { message: "User deleted successfully" };
  }

  async unblock(id: string) {
    await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", blockedAt: null },
    });

    return this.findById(id);
  }

  async activate(id: string) {
    await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", botStarted: true },
    });

    return this.findById(id);
  }

  async getStats() {
    const [total, active, blocked, pending, byDepartment] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "BLOCKED" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.groupBy({
        by: ["department"],
        _count: { id: true },
        where: { department: { not: null } },
      }),
    ]);

    return {
      total,
      active,
      blocked,
      pending,
      byDepartment: byDepartment.map((d) => ({
        department: d.department,
        count: d._count.id,
      })),
    };
  }

  async exportCsv(filters: { tagId?: string; search?: string; searchField?: string }) {
    const { tagId, search, searchField } = filters;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      if (searchField === "username") {
        where.username = { contains: search, mode: "insensitive" };
      } else if (searchField === "phone") {
        where.phone = { contains: search };
      } else if (searchField === "name") {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ];
      } else {
        where.OR = [
          { username: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ];
      }
    }

    if (tagId) where.tags = { some: { tagId } };

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { tags: { include: { tag: true } } },
    });

    const escape = (v: string | null | undefined) => {
      if (!v) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = ["ID", "Telegram ID", "Username", "Имя", "Фамилия", "Телефон", "Отдел", "Должность", "Статус", "Теги", "Дата добавления"];
    const rows = users.map((u) => [
      escape(u.id),
      escape(u.telegramId.toString()),
      escape(u.username),
      escape(u.firstName),
      escape(u.lastName),
      escape(u.phone),
      escape(u.department),
      escape(u.position),
      escape(u.status),
      escape((u.tags as any[]).map((t: any) => t.tag.name).join("; ")),
      escape(u.createdAt.toISOString().slice(0, 10)),
    ]);

    return [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  private serializeUser(user: any) {
    return {
      ...user,
      telegramId: user.telegramId.toString(),
      tags: user.tags?.map((ut: any) => ut.tag) || [],
      chatMemberships: user.chatMemberships?.map((cm: any) => ({
        ...cm,
        chat: cm.chat
          ? { ...cm.chat, telegramId: cm.chat.telegramId?.toString() }
          : undefined,
      })),
    };
  }
}

export const usersService = new UsersService();
