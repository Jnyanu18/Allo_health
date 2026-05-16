import type { Prisma } from "@prisma/client";
import type { Product, Reservation } from "@/types";

export const reservationInclude = {
  product: true,
  warehouse: true,
} satisfies Prisma.ReservationInclude;

export type ReservationWithDetails = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;

export function toReservationDto(
  reservation: ReservationWithDetails,
): Reservation {
  return {
    id: reservation.id,
    productId: reservation.productId,
    productName: reservation.product.name,
    productSku: reservation.product.sku,
    productPrice: Number(reservation.product.price),
    warehouseId: reservation.warehouseId,
    warehouseName: reservation.warehouse.name,
    warehouseCity: reservation.warehouse.city,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
  };
}

export type ProductWithStock = Prisma.ProductGetPayload<{
  include: { stock: { include: { warehouse: true } } };
}>;

export function toProductDto(product: ProductWithStock): Product {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: Number(product.price),
    category: product.category,
    imageUrl: product.imageUrl,
    stock: product.stock.map((stock) => ({
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse.name,
      warehouseCity: stock.warehouse.city,
      total: stock.total,
      reserved: stock.reserved,
      available: stock.total - stock.reserved,
    })),
  };
}
