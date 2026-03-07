import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional(),
});

export const updateTagSchema = createTagSchema.partial();

export type CreateTagDto = z.infer<typeof createTagSchema>;
export type UpdateTagDto = z.infer<typeof updateTagSchema>;