import prisma from "../../db/client";
import { AppError } from "../../common/errors/app-error";
import { sendMedia, buildInlineKeyboard } from "../../lib/telegram-bot";
import { SendNotificationDto, SyncUserDto } from "./integrations.schema";
import { usersService } from "../users/users.service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class IntegrationsService {
  /**
   * POST /send-notification
   * Отправить сообщение пользователям из внешней системы
   */
  async sendNotification(dto: SendNotificationDto) {
    const buttons = dto.buttons ?? [];
    const markup = buildInlineKeyboard(buttons);
    const options = { parse_mode: "HTML" as const, reply_markup: markup };

    let users: Array<{ id: string; telegramId: bigint }> = [];

    if (dto.allUsers) {
      users = await prisma.user.findMany({
        where: { status: "ACTIVE", botStarted: true },
        select: { id: true, telegramId: true },
      });
    } else if (dto.tagId) {
      users = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          botStarted: true,
          tags: { some: { tagId: dto.tagId } },
        },
        select: { id: true, telegramId: true },
      });
    } else if (dto.userIds?.length) {
      users = await prisma.user.findMany({
        where: {
          id: { in: dto.userIds },
          status: "ACTIVE",
          botStarted: true,
        },
        select: { id: true, telegramId: true },
      });
    }

    if (users.length === 0) {
      return { sent: 0, failed: 0, message: "No eligible recipients found" };
    }

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await sendMedia(
          Number(user.telegramId),
          dto.message,
          dto.mediaUrl,
          dto.mediaType,
          options,
        );
        sent++;
      } catch (err: any) {
        console.error(`[Integration] Failed to notify user ${user.telegramId}:`, err.message);
        failed++;
      }
      await delay(35);
    }

    console.log(`[Integration] send-notification: sent=${sent}, failed=${failed}`);
    return { sent, failed, total: users.length };
  }

  /**
   * POST /sync-user
   * Синхронизация пользователя из внешней системы (CRM/HR)
   */
  async syncUser(dto: SyncUserDto) {
    if (dto.action === "create") {
      // Проверяем, существует ли уже пользователь
      const existing = await prisma.user.findUnique({
        where: { telegramId: BigInt(dto.telegramId) },
      });

      if (existing) {
        // Обновляем данные существующего
        const updated = await usersService.update(existing.id, {
          username: dto.username,
          phone: dto.phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          department: dto.department,
          position: dto.position,
        });
        return { action: "updated", user: updated };
      }

      // Создаём нового
      const created = await usersService.create({
        telegramId: dto.telegramId,
        username: dto.username,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        department: dto.department,
        position: dto.position,
        tagIds: dto.tagIds,
        chatPackageId: dto.chatPackageId,
      });

      return { action: "created", user: created };
    }

    if (dto.action === "block") {
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(dto.telegramId) },
      });

      if (!user) {
        throw AppError.notFound(`User with telegramId ${dto.telegramId} not found`);
      }

      const result = await usersService.block(user.id);
      return { action: "blocked", ...result };
    }

    throw AppError.badRequest("Unknown action");
  }
}

export const integrationsService = new IntegrationsService();
