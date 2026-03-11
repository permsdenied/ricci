import prisma from "../../db/client";
import { AppError } from "../../common/errors/app-error";
import { telegramBot, buildInlineKeyboard, sendMedia } from "../../lib/telegram-bot";
import { markdownToTelegramHtml } from "../../lib/markdown-to-telegram";
import { CreateBroadcastDto, UpdateBroadcastDto, BroadcastQueryDto } from "./broadcasts.schema";
import { Broadcast, BroadcastStatus } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const INCLUDE_FULL = {
  targetTags: { include: { tag: { select: { id: true, name: true } } } },
  targetChats: { include: { chat: { select: { id: true, title: true, telegramId: true } } } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { recipients: true } },
};

function serializeBroadcast(b: any) {
  return {
    ...b,
    targetTags: b.targetTags?.map((bt: any) => bt.tag) ?? [],
    targetChats: b.targetChats?.map((bc: any) => ({
      ...bc.chat,
      telegramId: bc.chat.telegramId?.toString(),
    })) ?? [],
    recipientsCount: b._count?.recipients,
    _count: undefined,
  };
}

/** Задержка между сообщениями (Telegram rate limit ~30 msg/sec) */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ──────────────────────────────────────────────────────────────────────────────
// Отправка одного сообщения в чат или пользователю
// ──────────────────────────────────────────────────────────────────────────────
async function sendBroadcastMessage(
  chatId: number | string,
  broadcast: Broadcast,
) {
  const buttons = broadcast.buttons as Array<{ text: string; url: string }> | null;
  const markup = buildInlineKeyboard(buttons ?? []);
  const options = { parse_mode: "HTML" as const, reply_markup: markup };
  const htmlContent = markdownToTelegramHtml(broadcast.content);

  // Если есть несколько медиа — отправляем медиагруппу
  const mediaItems = broadcast.mediaItems as Array<{ url: string; type: string }> | null;
  if (mediaItems && mediaItems.length > 1) {
    // sendMediaGroup поддерживает только photo и video
    const groupable = mediaItems.filter((m) => m.type === "image" || m.type === "video");
    if (groupable.length > 1) {
      const mediaGroup = groupable.map((item, idx) => ({
        type: item.type === "image" ? ("photo" as const) : ("video" as const),
        media: item.url,
        // Текст сообщения ставим на первый элемент
        ...(idx === 0 ? { caption: htmlContent, parse_mode: "HTML" } : {}),
      }));
      await telegramBot.sendMediaGroup(chatId, mediaGroup);
      // Если есть документы/аудио — отправляем дополнительно
      const other = mediaItems.filter((m) => m.type !== "image" && m.type !== "video");
      for (const item of other) {
        await sendMedia(chatId, "", item.url, item.type, {});
      }
      // Если есть кнопки — отдельным сообщением (Telegram не поддерживает кнопки в медиагруппе)
      if (buttons && buttons.length > 0) {
        await telegramBot.sendMessage(chatId, "↑", { reply_markup: markup });
      }
      return;
    }
  }

  // Одно медиа или без медиа — стандартная отправка
  const firstMedia = mediaItems && mediaItems.length === 1 ? mediaItems[0] : null;
  const mediaUrl = firstMedia?.url ?? broadcast.mediaUrl ?? null;
  const mediaType = firstMedia?.type ?? broadcast.mediaType ?? null;
  return sendMedia(chatId, htmlContent, mediaUrl, mediaType, options);
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────
class BroadcastsService {
  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateBroadcastDto, adminId: string) {
    const broadcast = await prisma.broadcast.create({
      data: {
        title: dto.title,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        mediaItems: dto.mediaItems?.length ? dto.mediaItems : undefined,
        buttons: dto.buttons ?? [],
        targetType: dto.targetType,
        status: dto.scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById: adminId,
        targetTags: dto.tagIds?.length
          ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
        targetChats: dto.chatIds?.length
          ? { create: dto.chatIds.map((chatId) => ({ chatId })) }
          : undefined,
      },
      include: INCLUDE_FULL,
    });

    return serializeBroadcast(broadcast);
  }

  async findAll(query: BroadcastQueryDto) {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        where: status ? { status } : undefined,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: INCLUDE_FULL,
      }),
      prisma.broadcast.count({ where: status ? { status } : undefined }),
    ]);

    return {
      data: broadcasts.map(serializeBroadcast),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        ...INCLUDE_FULL,
        recipients: {
          take: 50,
          orderBy: { sentAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!broadcast) throw AppError.notFound("Broadcast not found");

    return {
      ...serializeBroadcast(broadcast),
      recipients: broadcast.recipients.map((r) => ({
        ...r,
        user: { ...r.user, telegramId: r.user.telegramId.toString() },
      })),
    };
  }

  async update(id: string, dto: UpdateBroadcastDto) {
    const existing = await prisma.broadcast.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Broadcast not found");

    if (existing.status === "SENT" || existing.status === "SENDING") {
      throw AppError.badRequest("Cannot edit a broadcast that is already sent or sending");
    }

    // Обновляем targets если переданы
    const broadcast = await prisma.$transaction(async (tx) => {
      if (dto.tagIds !== undefined) {
        await tx.broadcastTag.deleteMany({ where: { broadcastId: id } });
        if (dto.tagIds.length > 0) {
          await tx.broadcastTag.createMany({
            data: dto.tagIds.map((tagId) => ({ broadcastId: id, tagId })),
          });
        }
      }

      if (dto.chatIds !== undefined) {
        await tx.broadcastChat.deleteMany({ where: { broadcastId: id } });
        if (dto.chatIds.length > 0) {
          await tx.broadcastChat.createMany({
            data: dto.chatIds.map((chatId) => ({ broadcastId: id, chatId })),
          });
        }
      }

      const newStatus =
        dto.scheduledAt !== undefined
          ? dto.scheduledAt
            ? "SCHEDULED"
            : "DRAFT"
          : existing.status;

      return tx.broadcast.update({
        where: { id },
        data: {
          title: dto.title,
          content: dto.content,
          mediaUrl: dto.mediaUrl,
          mediaType: dto.mediaType,
          mediaItems: dto.mediaItems !== undefined ? (dto.mediaItems ?? undefined) : undefined,
          buttons: dto.buttons ?? undefined,
          targetType: dto.targetType,
          scheduledAt: dto.scheduledAt !== undefined
            ? dto.scheduledAt
              ? new Date(dto.scheduledAt)
              : null
            : undefined,
          status: newStatus as BroadcastStatus,
        },
        include: INCLUDE_FULL,
      });
    });

    return serializeBroadcast(broadcast);
  }

  async delete(id: string) {
    const existing = await prisma.broadcast.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Broadcast not found");

    if (existing.status === "SENDING") {
      throw AppError.badRequest("Cannot delete a broadcast that is currently sending");
    }

    await prisma.broadcast.delete({ where: { id } });
    return { message: "Broadcast deleted successfully" };
  }

  // ── Отправка ─────────────────────────────────────────────────────────────────

  /**
   * Немедленная отправка рассылки
   */
  async send(id: string) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        targetTags: true,
        targetChats: { include: { chat: { select: { telegramId: true, title: true } } } },
      },
    });

    if (!broadcast) throw AppError.notFound("Broadcast not found");

    if (broadcast.status === "SENT" || broadcast.status === "SENDING") {
      throw AppError.badRequest("Broadcast is already sent or sending");
    }

    // Меняем статус на SENDING
    await prisma.broadcast.update({
      where: { id },
      data: { status: "SENDING" },
    });

    // Отправляем асинхронно, чтобы не блокировать HTTP-ответ
    this.executeSend(broadcast).catch((err) =>
      console.error(`[Broadcast] Unhandled error sending broadcast ${id}:`, err),
    );

    return { message: "Broadcast sending started" };
  }

  /**
   * Внутренний метод: выполнить рассылку (вызывается из send() и планировщика)
   */
  async executeSend(broadcast: any) {
    console.log(`[Broadcast] Starting send for broadcast ${broadcast.id} (${broadcast.targetType})`);

    try {
      if (broadcast.targetType === "CHAT") {
        await this.sendToChats(broadcast);
      } else {
        await this.sendToUsers(broadcast);
      }

      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      console.log(`[Broadcast] Completed broadcast ${broadcast.id}`);
    } catch (err) {
      console.error(`[Broadcast] Failed broadcast ${broadcast.id}:`, err);
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "FAILED" },
      });
    }
  }

  // Отправка в чаты/каналы
  private async sendToChats(broadcast: any) {
    const chats = broadcast.targetChats as Array<{
      chat: { telegramId: bigint; title: string };
    }>;

    for (const { chat } of chats) {
      try {
        await sendBroadcastMessage(Number(chat.telegramId), broadcast);
        console.log(`[Broadcast] Sent to chat "${chat.title}"`);
      } catch (err) {
        console.error(`[Broadcast] Failed to send to chat "${chat.title}":`, err);
      }
      await delay(100);
    }
  }

  // Отправка пользователям в личку
  private async sendToUsers(broadcast: any) {
    let userIds: string[] = [];

    if (broadcast.targetType === "ALL_USERS") {
      const users = await prisma.user.findMany({
        where: { status: "ACTIVE", botStarted: true },
        select: { id: true, telegramId: true },
      });
      userIds = users.map((u) => u.id);

      await this.sendDmsToUsers(users, broadcast);
    } else if (broadcast.targetType === "TAG") {
      const tagIds = broadcast.targetTags.map((bt: any) => bt.tagId);

      const users = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          botStarted: true,
          tags: { some: { tagId: { in: tagIds } } },
        },
        select: { id: true, telegramId: true },
      });

      // Дедупликация (пользователь может иметь несколько тегов из списка)
      const unique = Array.from(new Map(users.map((u) => [u.id, u])).values());
      await this.sendDmsToUsers(unique, broadcast);
    }
  }

  private async sendDmsToUsers(
    users: Array<{ id: string; telegramId: bigint }>,
    broadcast: any,
  ) {
    console.log(`[Broadcast] Sending to ${users.length} users`);

    for (const user of users) {
      // Создаём запись получателя
      const recipient = await prisma.broadcastRecipient.upsert({
        where: { broadcastId_userId: { broadcastId: broadcast.id, userId: user.id } },
        create: { broadcastId: broadcast.id, userId: user.id },
        update: {},
      });

      try {
        await sendBroadcastMessage(Number(user.telegramId), broadcast);

        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { sentAt: new Date() },
        });
      } catch (err: any) {
        console.error(`[Broadcast] Failed to send to user ${user.telegramId}:`, err.message);
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { error: err.message },
        });
      }

      // ~30 msgs/sec limit → 35ms задержка
      await delay(35);
    }
  }

  // ── Планировщик ─────────────────────────────────────────────────────────────

  /**
   * Проверяет и отправляет scheduled broadcasts — вызывается из планировщика
   */
  async processScheduled() {
    const due = await prisma.broadcast.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
      },
      include: {
        targetTags: true,
        targetChats: { include: { chat: { select: { telegramId: true, title: true } } } },
      },
    });

    if (due.length === 0) return;

    console.log(`[Scheduler] Found ${due.length} broadcasts ready to send`);

    for (const broadcast of due) {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "SENDING" },
      });

      this.executeSend(broadcast).catch((err) =>
        console.error(`[Scheduler] Error sending broadcast ${broadcast.id}:`, err),
      );
    }
  }
}

export const broadcastsService = new BroadcastsService();
