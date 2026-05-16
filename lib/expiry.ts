import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

async function releaseOneExpired(id: string): Promise<boolean> {
  const now = new Date();

  return prisma.$transaction(
    async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          quantity: true,
          status: true,
        },
      });

      if (!reservation || reservation.status !== "PENDING") return false;

      const updated = await tx.reservation.updateMany({
        where: { id: reservation.id, status: "PENDING" },
        data: { status: "RELEASED", releasedAt: now },
      });

      if (updated.count === 0) return false;

      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reserved: { decrement: reservation.quantity } },
      });

      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function releaseExpiredReservations(limit = 100): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });

  let released = 0;
  for (const reservation of expired) {
    if (await releaseOneExpired(reservation.id)) released += 1;
  }
  return released;
}

export async function lazyExpireForProduct(
  productId: string,
  warehouseId: string,
): Promise<void> {
  const expired = await prisma.reservation.findMany({
    where: {
      productId,
      warehouseId,
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
  });

  for (const reservation of expired) {
    await releaseOneExpired(reservation.id);
  }
}
