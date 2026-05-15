import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  return withIdempotency(
    idempotencyKey,
    `POST:/api/reservations/${id}/confirm`,
    async () => {
      const now = new Date();

      try {
        const result = await prisma.$transaction(async (tx: any) => {
          const reservation = await tx.reservation.findUnique({
            where: { id },
            include: { product: true, warehouse: true },
          });

          if (!reservation) {
            return { error: "Reservation not found", status: 404 } as const;
          }

          if (reservation.status === "confirmed") {
            // Idempotent: already confirmed, return success
            return { reservation, status: 200 } as const;
          }

          if (reservation.status === "released" || reservation.status === "expired") {
            return {
              error: `Reservation has already been ${reservation.status}`,
              status: 410,
            } as const;
          }

          // Check expiry
          if (reservation.expiresAt <= now) {
            // Mark as expired and restore stock
            await tx.reservation.update({
              where: { id },
              data: { status: "expired" },
            });

            await tx.inventory.update({
              where: {
                productId_warehouseId: {
                  productId: reservation.productId,
                  warehouseId: reservation.warehouseId,
                },
              },
              data: { reservedUnits: { decrement: reservation.quantity } },
            });

            return {
              error: "Reservation has expired and stock has been released",
              expiredAt: reservation.expiresAt.toISOString(),
              status: 410,
            } as const;
          }

          // Confirm: decrement total stock and reserved
          await tx.inventory.update({
            where: {
              productId_warehouseId: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId,
              },
            },
            data: {
              totalUnits: { decrement: reservation.quantity },
              reservedUnits: { decrement: reservation.quantity },
            },
          });

          const confirmed = await tx.reservation.update({
            where: { id },
            data: { status: "confirmed", confirmedAt: now },
            include: { product: true, warehouse: true },
          });

          return { reservation: confirmed, status: 200 } as const;
        });

        if ("error" in result) {
          const { status, ...rest } = result;
          return NextResponse.json(rest, { status });
        }

        const { reservation } = result;
        return NextResponse.json({
          id: reservation.id,
          productName: reservation.product.name,
          warehouseName: reservation.warehouse.name,
          quantity: reservation.quantity,
          status: reservation.status,
          confirmedAt: reservation.confirmedAt?.toISOString(),
        });
      } catch (error) {
        console.error(`POST /api/reservations/${id}/confirm error:`, error);
        return NextResponse.json(
          { error: "Failed to confirm reservation" },
          { status: 500 },
        );
      }
    },
  );
}
