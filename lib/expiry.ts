import { prisma } from "./prisma";

// Release expired pending reservations and restore stock
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Find expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: {
      status: "pending",
      expiresAt: { lte: now },
    },
  });

  if (expired.length === 0) return 0;

  // Process each in a transaction
  let releasedCount = 0;
  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx: any) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: "expired",
          },
        });

        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            reservedUnits: { decrement: reservation.quantity },
          },
        });
      });
      releasedCount++;
    } catch (err) {
      console.error(`Failed to expire reservation ${reservation.id}:`, err);
    }
  }

  return releasedCount;
}

// Lazy expiry check — call this before reading stock to ensure freshness
export async function lazyExpireForProduct(
  productId: string,
  warehouseId: string,
): Promise<void> {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: {
      productId,
      warehouseId,
      status: "pending",
      expiresAt: { lte: now },
    },
  });

  if (expired.length === 0) return;

  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx: any) => {
        const updated = await tx.reservation.updateMany({
          where: { id: reservation.id, status: "pending" },
          data: { status: "expired" },
        });

        if (updated.count > 0) {
          await tx.inventory.update({
            where: {
              productId_warehouseId: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId,
              },
            },
            data: {
              reservedUnits: { decrement: reservation.quantity },
            },
          });
        }
      });
    } catch (err) {
      console.error(
        `Lazy expiry failed for reservation ${reservation.id}:`,
        err,
      );
    }
  }
}
