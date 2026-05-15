import { z } from "zod";

export const CreateReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "RELEASED",
]);

export type ReservationStatusType = z.infer<typeof ReservationStatusSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  description: z.string().nullable(),
  price: z.any(), // Decimal from Prisma
  imageUrl: z.string().nullable(),
});

export const StockSchema = z.object({
  warehouseId: z.string(),
  warehouseName: z.string(),
  warehouseLocation: z.string(),
  total: z.number(),
  reserved: z.number(),
  available: z.number(),
});
