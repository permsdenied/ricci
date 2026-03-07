import { config } from "../config";

const BASE_URL = `https://api.telegram.org/bot${config.telegram.botToken}`;

export class TelegramApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly description: string,
    public readonly errorCode?: number,
  ) {
    super(`Telegram API [${method}]: ${description}`);
    this.name = "TelegramApiError";
  }
}

async function apiCall<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as {
    ok: boolean;
    result: T;
    description?: string;
    error_code?: number;
  };

  if (!data.ok) {
    throw new TelegramApiError(method, data.description ?? "Unknown error", data.error_code);
  }

  return data.result;
}

export interface InlineButton {
  text: string;
  url: string;
}

export interface ReplyMarkup {
  inline_keyboard: InlineButton[][];
}

export interface SendMessageOptions {
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: ReplyMarkup;
  disable_web_page_preview?: boolean;
}

export interface MediaOptions extends SendMessageOptions {
  caption?: string;
}

export const telegramBot = {
  /**
   * Отправить текстовое сообщение
   */
  sendMessage(
    chatId: number | string,
    text: string,
    options: SendMessageOptions = {},
  ) {
    return apiCall<{ message_id: number }>("sendMessage", {
      chat_id: chatId,
      text,
      ...options,
    });
  },

  /**
   * Отправить фото (file_id или URL)
   */
  sendPhoto(chatId: number | string, photo: string, options: MediaOptions = {}) {
    return apiCall<{ message_id: number }>("sendPhoto", {
      chat_id: chatId,
      photo,
      ...options,
    });
  },

  /**
   * Отправить видео (file_id или URL)
   */
  sendVideo(chatId: number | string, video: string, options: MediaOptions = {}) {
    return apiCall<{ message_id: number }>("sendVideo", {
      chat_id: chatId,
      video,
      ...options,
    });
  },

  /**
   * Отправить документ (file_id или URL)
   */
  sendDocument(chatId: number | string, document: string, options: MediaOptions = {}) {
    return apiCall<{ message_id: number }>("sendDocument", {
      chat_id: chatId,
      document,
      ...options,
    });
  },

  /**
   * Отправить аудио (file_id или URL)
   */
  sendAudio(chatId: number | string, audio: string, options: MediaOptions = {}) {
    return apiCall<{ message_id: number }>("sendAudio", {
      chat_id: chatId,
      audio,
      ...options,
    });
  },

  /**
   * Забанить пользователя в чате (кик с баном)
   */
  banChatMember(chatId: number | string, userId: number) {
    return apiCall<boolean>("banChatMember", {
      chat_id: chatId,
      user_id: userId,
    });
  },

  /**
   * Разбанить пользователя (позволяет кикнуть без перманентного бана)
   */
  unbanChatMember(chatId: number | string, userId: number) {
    return apiCall<boolean>("unbanChatMember", {
      chat_id: chatId,
      user_id: userId,
      only_if_banned: true,
    });
  },

  /**
   * Создать персональную инвайт-ссылку (одноразовую)
   */
  createChatInviteLink(
    chatId: number | string,
    options: {
      name?: string;
      expireDate?: number; // Unix timestamp
      memberLimit?: number; // 1–99999
    } = {},
  ) {
    return apiCall<{ invite_link: string; name?: string; expire_date?: number }>(
      "createChatInviteLink",
      {
        chat_id: chatId,
        name: options.name,
        expire_date: options.expireDate,
        member_limit: options.memberLimit,
      },
    );
  },

  /**
   * Получить статус участника в чате
   */
  getChatMember(chatId: number | string, userId: number) {
    return apiCall<{
      status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
      user: { id: number };
    }>("getChatMember", {
      chat_id: chatId,
      user_id: userId,
    });
  },
};

/**
 * Вспомогательная функция: собрать Telegram reply_markup из плоского массива кнопок
 * Каждая кнопка — отдельная строка (для читаемости)
 */
export function buildInlineKeyboard(
  buttons: Array<{ text: string; url: string }>,
): ReplyMarkup | undefined {
  if (!buttons || buttons.length === 0) return undefined;
  return {
    inline_keyboard: buttons.map((btn) => [{ text: btn.text, url: btn.url }]),
  };
}

/**
 * Отправить медиа-сообщение с учётом типа контента
 */
export async function sendMedia(
  chatId: number | string,
  content: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
  options: SendMessageOptions = {},
) {
  const mediaOptions: MediaOptions = { ...options, caption: content };

  if (mediaUrl && mediaType) {
    switch (mediaType) {
      case "image":
        return telegramBot.sendPhoto(chatId, mediaUrl, mediaOptions);
      case "video":
        return telegramBot.sendVideo(chatId, mediaUrl, mediaOptions);
      case "document":
        return telegramBot.sendDocument(chatId, mediaUrl, mediaOptions);
      case "audio":
        return telegramBot.sendAudio(chatId, mediaUrl, mediaOptions);
    }
  }

  return telegramBot.sendMessage(chatId, content, options);
}
