import { z } from "zod";

export const createChatPackageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  chatIds: z.array(z.string()).optional(),
});

export const updateChatPackageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const updatePackageChatsSchema = z.object({
  chatIds: z.array(z.string()),
});

export type CreateChatPackageDto = z.infer<typeof createChatPackageSchema>;
export type UpdateChatPackageDto = z.infer<typeof updateChatPackageSchema>;
export type UpdatePackageChatsDto = z.infer<typeof updatePackageChatsSchema>;