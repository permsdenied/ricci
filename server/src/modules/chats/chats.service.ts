import prisma from "../../db/client";
import { AppError } from "../../common/errors/app-error";
import { UpdateChatDto, ChatQueryDto } from "./chats.schema";
import { Prisma } from "@prisma/client";

class ChatsService {
  async findAll(query: ChatQueryDto) {
    const where: Prisma.ChatWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.hasIssues) {
      // Чаты, где бот не админ или нет нужных прав
      where.OR = [
        { botIsAdmin: false },
        { canPost: false },
        { canInvite: false },
        { canBan: false },
      ];
    }

    const chats = await prisma.chat.findMany({
      where,
      orderBy: { title: "asc" },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    return chats.map(this.serializeChat);
  }

  async findById(id: string) {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
        },
        packageItems: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!chat) {
      throw AppError.notFound("Chat not found");
    }

    return this.serializeChat(chat);
  }

  async findByTelegramId(telegramId: bigint) {
    const chat = await prisma.chat.findUnique({
      where: { telegramId },
    });

    return chat ? this.serializeChat(chat) : null;
  }

  async update(id: string, dto: UpdateChatDto) {
    const chat = await prisma.chat.update({
      where: { id },
      data: dto,
    });

    return this.serializeChat(chat);
  }

  // Обновление прав бота (вызывается из webhook)
  async updateBotPermissions(
    telegramId: bigint,
    permissions: {
      botIsAdmin: boolean;
      canPost: boolean;
      canInvite: boolean;
      canBan: boolean;
      canPin: boolean;
    }
  ) {
    return prisma.chat.update({
      where: { telegramId },
      data: permissions,
    });
  }

  // Создание/обновление чата из webhook
  async upsertFromTelegram(data: {
    telegramId: bigint;
    title: string;
    type: "GROUP" | "SUPERGROUP" | "CHANNEL";
    botIsAdmin: boolean;
    canPost: boolean;
    canInvite: boolean;
    canBan: boolean;
    canPin: boolean;
  }) {
    const chat = await prisma.chat.upsert({
      where: { telegramId: data.telegramId },
      create: data,
      update: {
        title: data.title,
        botIsAdmin: data.botIsAdmin,
        canPost: data.canPost,
        canInvite: data.canInvite,
        canBan: data.canBan,
        canPin: data.canPin,
      },
    });

    return this.serializeChat(chat);
  }

  async getStats() {
    const [total, groups, supergroups, channels, withIssues] = await Promise.all([
      prisma.chat.count({ where: { isActive: true } }),
      prisma.chat.count({ where: { type: "GROUP", isActive: true } }),
      prisma.chat.count({ where: { type: "SUPERGROUP", isActive: true } }),
      prisma.chat.count({ where: { type: "CHANNEL", isActive: true } }),
      prisma.chat.count({
        where: {
          isActive: true,
          OR: [
            { botIsAdmin: false },
            { canPost: false },
            { canInvite: false },
          ],
        },
      }),
    ]);

    return { total, groups, supergroups, channels, withIssues };
  }

  async getMembers(chatId: string) {
    const memberships = await prisma.chatMembership.findMany({
      where: { chatId },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            department: true,
            status: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m,
      user: {
        ...m.user,
        telegramId: m.user.telegramId.toString(),
      },
    }));
  }

  private serializeChat(chat: any) {
    return {
      ...chat,
      telegramId: chat.telegramId.toString(),
      membersCount: chat._count?.memberships,
      _count: undefined,
      memberships: chat.memberships?.map((m: any) => ({
        ...m,
        user: m.user
          ? {
              ...m.user,
              telegramId: m.user.telegramId.toString(),
            }
          : undefined,
      })),
    };
  }
}

export const chatsService = new ChatsService();