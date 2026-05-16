import { NextRequest, NextResponse } from "next/server";
import { reservationInclude, toReservationDto } from "@/lib/dto";
import { withIdempotency } from "@/lib/idempotency";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  try {
    return await withIdempotency(
      idempotencyKey,
      `POST /api/reservations/${id}/confirm`,
      async () => {
        const now = new Date();

        const result = await prisma.$transaction(async (tx) => {
          // Atomic: only confirms if PENDING and within expiry window
          const updated = await tx.reservation.updateMany({
            where: { id, status: "PENDING", expiresAt: { gt: now } },
            data: { status: "CONFIRMED", confirmedAt: now },
          });

          if (updated.count === 0) {
            const existing = await tx.reservation.findUnique({
              where: { id },
              include: reservationInclude,
            });

            if (!existing) {
              return { status: 404 as const, body: { error: "Reservation not found" } };
            }

            if (existing.status === "CONFIRMED") {
              return { status: 200 as const, body: toReservationDto(existing) };
            }

            // PENDING but expired — release and return 410
            if (existing.status === "PENDING") {
              await tx.reservation.updateMany({
                where: { id, status: "PENDING" },
                data: { status: "RELEASED", releasedAt: now },
              });
              await tx.stock.update({
                where: {
                  productId_warehouseId: {
                    productId: existing.productId,
                    warehouseId: existing.warehouseId,
                  },
                },
                data: { reserved: { decrement: existing.quantity } },
              });
              return {
                status: 410 as const,
                body: {
                  error: "Reservation expired",
                  expiredAt: existing.expiresAt.toISOString(),
                },
              };
            }

            return {
              status: 410 as const,
              body: {
                error: "Reservation has been released",
                expiredAt: existing.releasedAt?.toISOString() ?? existing.expiresAt.toISOString(),
              },
            };
          }

          // Fetch confirmed reservation (needed for stock update + response)
          const confirmed = await tx.reservation.findUnique({
            where: { id },
            include: reservationInclude,
          });

          await tx.stock.update({
            where: {
              productId_warehouseId: {
                productId: confirmed!.productId,
                warehouseId: confirmed!.warehouseId,
              },
            },
            data: {
              total: { decrement: confirmed!.quantity },
              reserved: { decrement: confirmed!.quantity },
            },
          });

          return { status: 200 as const, body: toReservationDto(confirmed!) };
        });

        return NextResponse.json(result.body, { status: result.status });
      },
    );
  } catch (error) {
    console.error("POST confirm error:", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
