import prisma from "../../db/client";
import { ChatType } from "@prisma/client";
import { telegramBot, buildInlineKeyboard } from "../../lib/telegram-bot";
import { sendInviteLinksToUser, triggerOnboarding } from "../users/users.service";

// ──────────────────────────────────────────────────────────────────────────────
// Telegram Update types
// ──────────────────────────────────────────────────────────────────────────────

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  title?: string;
  type: "private" | "group" | "supergroup" | "channel";
}

interface ChatMember {
  user: TelegramUser;
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  can_post_messages?: boolean;
  can_invite_users?: boolean;
  can_restrict_members?: boolean;
  can_pin_messages?: boolean;
}

interface ChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: {
    invite_link: string;
    creator: TelegramUser;
  };
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: ChatMemberUpdated;
  chat_member?: ChatMemberUpdated;
}

function mapChatType(type: string): ChatType {
  switch (type) {
    case "group":
      return "GROUP";
    case "supergroup":
      return "SUPERGROUP";
    case "channel":
      return "CHANNEL";
    default:
      return "GROUP";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

class TelegramService {
  private processedUpdates = new Set<number>();

  async handleWebhook(update: TelegramUpdate) {
    // Защита от дублей
    if (this.processedUpdates.has(update.update_id)) {
      console.log(`⏭️ Skipping duplicate update ${update.update_id}`);
      return;
    }
    this.processedUpdates.add(update.update_id);

    if (this.processedUpdates.size > 1000) {
      const arr = Array.from(this.processedUpdates);
      arr.slice(0, 500).forEach((id) => this.processedUpdates.delete(id));
    }

    console.log("📥 Telegram update:", JSON.stringify(update, null, 2));

    if (update.message?.migrate_to_chat_id) {
      await this.handleChatMigration(
        update.message.chat.id,
        update.message.migrate_to_chat_id,
      );
      return;
    }

    if (update.my_chat_member) {
      await this.handleMyChatMember(update.my_chat_member);
    }

    if (update.chat_member) {
      await this.handleChatMember(update.chat_member);
    }

    if (
      update.message &&
      !update.message.migrate_to_chat_id &&
      !update.message.migrate_from_chat_id
    ) {
      await this.handleMessage(update.message);
    }
  }

  // ──────────────────────────────────────────────
  // Миграция group → supergroup
  // ──────────────────────────────────────────────
  private async handleChatMigration(oldChatId: number, newChatId: number) {
    console.log(`🔄 Chat migration: ${oldChatId} → ${newChatId}`);

    try {
      const existingNew = await prisma.chat.findUnique({
        where: { telegramId: BigInt(newChatId) },
      });

      if (existingNew) {
        await prisma.chat.deleteMany({
          where: { telegramId: BigInt(oldChatId) },
        });
        console.log(`✅ Deleted old chat ${oldChatId}, keeping ${newChatId}`);
        return;
      }

      const updated = await prisma.chat.updateMany({
        where: { telegramId: BigInt(oldChatId) },
        data: { telegramId: BigInt(newChatId), type: "SUPERGROUP" },
      });

      if (updated.count > 0) {
        console.log(`✅ Migrated chat ${oldChatId} → ${newChatId}`);
      } else {
        console.log(`⚠️ No chat found with ID ${oldChatId} to migrate`);
      }
    } catch (error) {
      console.error("Migration error:", error);
    }
  }

  // ──────────────────────────────────────────────
  // Изменение статуса бота в чате
  // ──────────────────────────────────────────────
  private async handleMyChatMember(data: ChatMemberUpdated) {
    const { chat, new_chat_member, old_chat_member } = data;

    console.log(
      `🤖 Bot status changed in "${chat.title}": ${old_chat_member.status} → ${new_chat_member.status}`,
    );

    const isAdmin = new_chat_member.status === "administrator";
    const isMember = new_chat_member.status === "member";
    const isRemoved =
      new_chat_member.status === "left" || new_chat_member.status === "kicked";

    if (isRemoved) {
      await prisma.chat.updateMany({
        where: { telegramId: BigInt(chat.id) },
        data: {
          isActive: false,
          botIsAdmin: false,
          canPost: false,
          canInvite: false,
          canBan: false,
          canPin: false,
        },
      });
      console.log(`❌ Bot removed from chat ${chat.id}`);
      return;
    }

    await prisma.chat.upsert({
      where: { telegramId: BigInt(chat.id) },
      create: {
        telegramId: BigInt(chat.id),
        title: chat.title ?? "Private chat",
        type: mapChatType(chat.type),
        isActive: true,
        botIsAdmin: isAdmin,
        canPost: isAdmin || isMember,
        canInvite: Boolean(new_chat_member.can_invite_users),
        canBan: Boolean(new_chat_member.can_restrict_members),
        canPin: Boolean(new_chat_member.can_pin_messages),
      },
      update: {
        title: chat.title ?? "Private chat",
        type: mapChatType(chat.type),
        isActive: true,
        botIsAdmin: isAdmin,
        canPost: isAdmin || isMember,
        canInvite: Boolean(new_chat_member.can_invite_users),
        canBan: Boolean(new_chat_member.can_restrict_members),
        canPin: Boolean(new_chat_member.can_pin_messages),
      },
    });

    console.log(
      `✅ Chat ${chat.id} updated: admin=${isAdmin}, canInvite=${new_chat_member.can_invite_users}, canBan=${new_chat_member.can_restrict_members}`,
    );
  }

  // ──────────────────────────────────────────────
  // Вступление / выход пользователей
  // ──────────────────────────────────────────────
  private async handleChatMember(data: ChatMemberUpdated) {
    const { chat, new_chat_member, old_chat_member, invite_link } = data;
    const user = new_chat_member.user;

    if (user.is_bot) return;

    const wasOut = ["left", "kicked"].includes(old_chat_member.status);
    const isIn = ["member", "administrator", "creator"].includes(new_chat_member.status);
    const isOut = ["left", "kicked"].includes(new_chat_member.status);

    if (wasOut && isIn) {
      console.log(`👤 User ${user.id} joined chat ${chat.id}`);
      await this.handleUserJoined(chat.id, user, invite_link?.invite_link);
    }

    if (!wasOut && isOut) {
      console.log(`👤 User ${user.id} left chat ${chat.id}`);
      await this.handleUserLeft(chat.id, user.id);
    }
  }

  // ──────────────────────────────────────────────
  // Сообщения
  // ──────────────────────────────────────────────
  private async handleMessage(message: TelegramMessage) {
    if (message.chat.type === "private" && message.text === "/start") {
      if (message.from) {
        await this.handleBotStart(message.from);
      }
      return;
    }

    if (message.new_chat_members) {
      for (const user of message.new_chat_members) {
        if (!user.is_bot) {
          await this.handleUserJoined(message.chat.id, user);
        }
      }
    }

    if (message.left_chat_member && !message.left_chat_member.is_bot) {
      await this.handleUserLeft(message.chat.id, message.left_chat_member.id);
    }
  }

  // ──────────────────────────────────────────────
  // /start — пользователь запустил бота
  // ──────────────────────────────────────────────
  private async handleBotStart(from: TelegramUser) {
    console.log(`🚀 User ${from.id} started bot`);

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(from.id) },
      create: {
        telegramId: BigInt(from.id),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        status: "ACTIVE",
        botStarted: true,
      },
      update: {
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        botStarted: true,
        status: "ACTIVE",
      },
    });

    // 1. Проверяем отложенные инвайт-ссылки (созданные до того, как он нажал /start)
    const pendingLinks = await prisma.inviteLink.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      include: { chat: { select: { title: true, id: true } } },
    });
    const pendingChatIds = new Set(pendingLinks.map((l) => l.chatId));

    // 2. Авто-отправка дефолтного пакета для чатов, которых ещё нет у пользователя
    let sentDefaultPackage = false;
    const defaultPkg = await prisma.chatPackage.findFirst({
      where: { isDefault: true },
      include: { items: { select: { chatId: true } } },
    });

    if (defaultPkg && defaultPkg.items.length > 0) {
      const allDefaultChatIds = defaultPkg.items.map((i) => i.chatId);

      const existingMemberships = await prisma.chatMembership.findMany({
        where: { userId: user.id, chatId: { in: allDefaultChatIds } },
        select: { chatId: true },
      });
      const existingChatIds = new Set(existingMemberships.map((m) => m.chatId));

      // Берём только те чаты, где нет ни membership, ни pending-ссылки
      const newChatIds = allDefaultChatIds.filter(
        (id) => !existingChatIds.has(id) && !pendingChatIds.has(id),
      );

      if (newChatIds.length > 0) {
        await prisma.chatMembership.createMany({
          data: newChatIds.map((chatId) => ({
            userId: user.id,
            chatId,
            status: "PENDING_INVITE" as const,
          })),
          skipDuplicates: true,
        });
        // triggerOnboarding создаст ссылки и сразу отправит (botStarted=true)
        await triggerOnboarding(user.id, user.telegramId, true, newChatIds);
        sentDefaultPackage = true;
        console.log(`[Bot] Auto-assigned default package (${newChatIds.length} chats) to user ${from.id}`);
      }
    }

    // 3. Отправляем отложенные ссылки от ручных назначений администратора
    if (pendingLinks.length > 0) {
      await sendInviteLinksToUser(
        from.id,
        pendingLinks.map((l) => ({ chatTitle: l.chat.title, link: l.link })),
      );
    } else if (!sentDefaultPackage) {
      // Ни pending-ссылок, ни дефолтного пакета — просто приветствие
      try {
        await telegramBot.sendMessage(
          from.id,
          `👋 <b>Добро пожаловать!</b>\n\nВы подключены к корпоративному боту. Ожидайте приглашений от HR.`,
          { parse_mode: "HTML" },
        );
      } catch (err) {
        console.error(`[Bot] Failed to send welcome message to ${from.id}:`, err);
      }
    }
  }

  // ──────────────────────────────────────────────
  // Пользователь вступил в чат
  // ──────────────────────────────────────────────
  private async handleUserJoined(
    chatId: number,
    user: TelegramUser,
    inviteLink?: string,
  ) {
    const dbUser = await prisma.user.findUnique({
      where: { telegramId: BigInt(user.id) },
    });

    if (!dbUser) {
      console.log(`⚠️ Unknown user ${user.id} joined chat ${chatId}`);
      return;
    }

    const dbChat = await prisma.chat.findUnique({
      where: { telegramId: BigInt(chatId) },
    });

    if (!dbChat) {
      console.log(`⚠️ Unknown chat ${chatId}`);
      return;
    }

    // Проверка инвайт-ссылки
    if (inviteLink) {
      const link = await prisma.inviteLink.findFirst({
        where: { link: inviteLink },
      });

      if (link) {
        if (link.userId !== dbUser.id) {
          // Ссылкой воспользовался не тот человек — уведомляем в консоль и сохраняем факт
          console.warn(
            `🚨 [Security] Invite link "${inviteLink}" used by wrong user! Expected userId: ${link.userId}, got telegramId: ${user.id}`,
          );
          await this.notifyAdminsAboutWrongInviteUsage(link.userId, dbUser.id, inviteLink, dbChat.title);
        }

        await prisma.inviteLink.update({
          where: { id: link.id },
          data: { usedAt: new Date(), usedByTgId: BigInt(user.id) },
        });
      }
    }

    // Обновляем membership
    await prisma.chatMembership.upsert({
      where: { userId_chatId: { userId: dbUser.id, chatId: dbChat.id } },
      create: {
        userId: dbUser.id,
        chatId: dbChat.id,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      update: { status: "ACTIVE", joinedAt: new Date(), leftAt: null },
    });

    console.log(`✅ User ${user.id} membership updated for chat ${chatId}`);
  }

  // ──────────────────────────────────────────────
  // Пользователь покинул чат
  // ──────────────────────────────────────────────
  private async handleUserLeft(chatId: number, userId: number) {
    const dbUser = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
    });

    if (!dbUser) return;

    const dbChat = await prisma.chat.findUnique({
      where: { telegramId: BigInt(chatId) },
    });

    if (!dbChat) return;

    await prisma.chatMembership.updateMany({
      where: { userId: dbUser.id, chatId: dbChat.id },
      data: { status: "LEFT", leftAt: new Date() },
    });

    console.log(`✅ User ${userId} left chat ${chatId}`);
  }

  // ──────────────────────────────────────────────
  // Уведомление администраторов о подозрительном использовании инвайт-ссылки
  // Отправляем сообщение всем активным SUPER_ADMIN-ам у которых есть telegramId
  // (в текущей схеме telegramId у Admin не хранится — уведомление логируется в консоль)
  // ──────────────────────────────────────────────
  private async notifyAdminsAboutWrongInviteUsage(
    expectedUserId: string,
    actualDbUserId: string,
    inviteLink: string,
    chatTitle: string,
  ) {
    const expectedUser = await prisma.user.findUnique({
      where: { id: expectedUserId },
      select: { firstName: true, lastName: true, username: true, telegramId: true },
    });

    const actualUser = await prisma.user.findUnique({
      where: { id: actualDbUserId },
      select: { firstName: true, lastName: true, username: true, telegramId: true },
    });

    const expectedName = expectedUser
      ? `${expectedUser.firstName ?? ""} ${expectedUser.lastName ?? ""}`.trim() ||
        expectedUser.username ||
        expectedUser.telegramId.toString()
      : expectedUserId;

    const actualName = actualUser
      ? `${actualUser.firstName ?? ""} ${actualUser.lastName ?? ""}`.trim() ||
        actualUser.username ||
        actualUser.telegramId.toString()
      : actualDbUserId;

    console.error(
      `🚨 [SECURITY ALERT] Invite link for "${expectedName}" was used by "${actualName}" in chat "${chatTitle}"`,
    );

    // TODO: Когда у модели Admin появится telegramId — добавить отправку сообщения супер-админам:
    // const superAdmins = await prisma.admin.findMany({ where: { role: 'SUPER_ADMIN', isActive: true, telegramId: { not: null } } });
    // for (const admin of superAdmins) {
    //   await telegramBot.sendMessage(admin.telegramId, `🚨 Инвайт-ссылка...`);
    // }
  }
}

export const telegramService = new TelegramService();
