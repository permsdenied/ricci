import { z } from "zod";

export const updateChatSchema = z.object({
  isActive: z.boolean().optional(),
  inviteLink: z.string().url().optional(),
});

export const chatQuerySchema = z.object({
  type: z.enum(["GROUP", "SUPERGROUP", "CHANNEL"]).optional(),
  isActive: z.string().transform((v) => v === "true").optional(),
  hasIssues: z.string().transform((v) => v === "true").optional(), // Есть проблемы с правами
});

export type UpdateChatDto = z.infer<typeof updateChatSchema>;
export type ChatQueryDto = z.infer<typeof chatQuerySchema>;