import { z } from "zod";

const inlineButtonSchema = z.object({
  text: z.string().min(1),
  url: z.string().url(),
});

const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video", "document", "audio"]),
});

export const createBroadcastSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Message content is required"),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "document", "audio"]).optional(),
  mediaItems: z.array(mediaItemSchema).max(10).optional(), // до 10 элементов (лимит Telegram)
  buttons: z.array(inlineButtonSchema).optional(),

  // Таргетинг
  targetType: z.enum(["CHAT", "TAG", "ALL_USERS"]),
  tagIds: z.array(z.string()).optional(),   // для targetType=TAG
  chatIds: z.array(z.string()).optional(),  // для targetType=CHAT

  // Отложенная отправка
  scheduledAt: z.string().datetime().optional(),
});

export const updateBroadcastSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1).optional(),
  mediaUrl: z.string().url().nullable().optional(),
  mediaType: z.enum(["image", "video", "document", "audio"]).nullable().optional(),
  mediaItems: z.array(mediaItemSchema).max(10).nullable().optional(),
  buttons: z.array(inlineButtonSchema).nullable().optional(),
  targetType: z.enum(["CHAT", "TAG", "ALL_USERS"]).optional(),
  tagIds: z.array(z.string()).optional(),
  chatIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const broadcastQuerySchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateBroadcastDto = z.infer<typeof createBroadcastSchema>;
export type UpdateBroadcastDto = z.infer<typeof updateBroadcastSchema>;
export type BroadcastQueryDto = z.infer<typeof broadcastQuerySchema>;
