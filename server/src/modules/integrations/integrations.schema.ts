import { z } from "zod";

// POST /api/integrations/send-notification
export const sendNotificationSchema = z.object({
  // Получатели: один из вариантов обязателен
  userIds: z.array(z.string()).optional(),
  tagId: z.string().optional(),
  allUsers: z.boolean().optional(),

  message: z.string().min(1, "Message is required"),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "document", "audio"]).optional(),
  buttons: z
    .array(z.object({ text: z.string().min(1), url: z.string().url() }))
    .optional(),
}).refine(
  (data) => data.userIds?.length || data.tagId || data.allUsers,
  { message: "At least one of userIds, tagId or allUsers must be provided" },
);

// POST /api/integrations/sync-user
export const syncUserSchema = z.object({
  telegramId: z.string().min(1, "telegramId is required"),
  action: z.enum(["create", "block"]),

  // Поля для action=create
  username: z.string().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  chatPackageId: z.string().optional(),
});

export type SendNotificationDto = z.infer<typeof sendNotificationSchema>;
export type SyncUserDto = z.infer<typeof syncUserSchema>;
