import { z } from "zod";

export const createUserSchema = z.object({
  telegramId: z.union([z.number(), z.string()]).transform(String),
  username: z.string().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  chatPackageId: z.string().optional(),
});

export const updateUserSchema = z.object({
  username: z.string().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  searchField: z.enum(["name", "username", "phone"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "PENDING"]).optional(),
  tagId: z.string().optional(),
  department: z.string().optional(),
});

export const assignTagsSchema = z.object({
  tagIds: z.array(z.string()).min(1, "At least one tag is required"),
});

export const assignChatsSchema = z.object({
  chatIds: z.array(z.string()).min(1, "At least one chat is required"),
});

export const sendPackageSchema = z.object({
  packageId: z.string().min(1),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserQueryDto = z.infer<typeof userQuerySchema>;
export type AssignTagsDto = z.infer<typeof assignTagsSchema>;
export type AssignChatsDto = z.infer<typeof assignChatsSchema>;
export type SendPackageDto = z.infer<typeof sendPackageSchema>;
