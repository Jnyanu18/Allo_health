import { z } from "zod";

export const createReservationSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.coerce.number().int().min(1).max(100),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
