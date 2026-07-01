import { z } from "zod";
import { env } from "@/config/env";

// Enforce strict guidelines on photo structures uploaded to R2
export const cartPhotoSchema = z.object({
  key: z.string().min(1, "Storage lookup key is required."),
  name: z.string().min(1, "Display file name is required."),
  size: z.number().int().positive("File size metrics must be positive numbers.")
});

export type CartPhotoInput = z.infer<typeof cartPhotoSchema>;

export const cartItemSchema = z.object({
  productId: z.string().min(1, "Product ID identifier is required."),
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1 unit.")
    .max(10, "For bulk orders greater than 10 units, please contact custom support."),
  customMessage: z
    .string()
    .trim()
    .max(250, "Custom engravings or dedication lines cannot exceed 250 characters.")
    .optional()
    .transform(val => (val === "" ? undefined : val)),
  photos: z
    .array(cartPhotoSchema)
    .max(
      env.UPLOAD_MAX_FILES,
      `Maximum upload limit exceeded. You can only attach up to ${env.UPLOAD_MAX_FILES} photos per item.`
    )
    .default([])
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

export const syncCartSchema = z.object({
  cartId: z.string().trim().min(1, "Local cart identifier is required."),
  items: z.array(cartItemSchema)
});

export type SyncCartInput = z.infer<typeof syncCartSchema>;