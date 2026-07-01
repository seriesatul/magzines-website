import { z } from "zod";

// Comprehensive read-only list of all official Indian States and Union Territories (Rule 10)
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

export const indianStateSchema = z.enum(INDIAN_STATES);

export const paymentMethodSchema = z.enum(["PREPAID", "COD", "PARTIAL_COD"]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number (e.g. 9876543210)."),
  addressLine1: z
    .string()
    .trim()
    .min(5, "Address line 1 must contain at least 5 characters.")
    .max(250, "Address cannot exceed 250 characters."),
  addressLine2: z
    .string()
    .trim()
    .max(250, "Address line 2 cannot exceed 250 characters.")
    .optional()
    .transform(val => (val === "" ? undefined : val)),
  city: z
    .string()
    .trim()
    .min(2, "City name must contain at least 2 characters.")
    .max(100, "City name cannot exceed 100 characters."),
  state: indianStateSchema,
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Must be a valid 6-digit Indian postal pin code (e.g., 110001).")
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: paymentMethodSchema,
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform(val => (val === "" ? undefined : val)),
  customerNote: z
    .string()
    .trim()
    .max(500, "Customer message cannot exceed 500 characters.")
    .optional()
    .transform(val => (val === "" ? undefined : val)),
  uploadLaterOnWhatsApp: z.boolean().default(false)
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;