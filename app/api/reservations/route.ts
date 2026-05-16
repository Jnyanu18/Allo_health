import { NextRequest, NextResponse } from "next/server";
import { reservationInclude, toReservationDto } from "@/lib/dto";
import { lazyExpireForProduct } from "@/lib/expiry";
import { withIdempotency } from "@/lib/idempotency";
import { prisma } from "@/lib/prisma";
import { acquireLock, releaseLock } from "@/lib/redis";
import { createReservationSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type LockedStockRow = {
  id: string;
  total: number;
  reserved: number;
};

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { productId, warehouseId, quantity } = parsed.data;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  try {
    return await withIdempotency(
    idempotencyKey,
    "POST /api/reservations",
    async () => {
      // Run expiry cleanup and lock acquisition in parallel.
      // The Redis lock reduces DB contention under high concurrency but is advisory only —
      // SELECT FOR UPDATE is the correctness guarantee. If the lock is held or Redis is
      // unavailable, we proceed straight to the DB transaction.
      const lockKey = `stock:${productId}:${warehouseId}`;
      const [, lockOutcome] = await Promise.allSettled([
        lazyExpireForProduct(productId, warehouseId),
        acquireLock(lockKey, 2000),
      ]);
      const lockToken = lockOutcome.status === "fulfilled" ? lockOutcome.value : null;

      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const rows = await tx.$queryRaw<LockedStockRow[]>`
              SELECT id, total, reserved
              FROM "Stock"
              WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
              FOR UPDATE
            `;

            const stock = rows[0];
            if (!stock) {
              return { status: 404 as const, body: { error: "Not found" } };
            }

            const available = stock.total - stock.reserved;
            if (available < quantity) {
              return {
                status: 409 as const,
                body: {
                  error: "Insufficient stock",
                  available,
                  requested: quantity,
                },
              };
            }

            await tx.stock.update({
              where: { id: stock.id },
              data: { reserved: { increment: quantity } },
            });

            const reservation = await tx.reservation.create({
              data: {
                productId,
                warehouseId,
                quantity,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
              },
              include: reservationInclude,
            });

            return {
              status: 201 as const,
              body: toReservationDto(reservation),
            };
          },
          { timeout: 8000 },
        );

        return NextResponse.json(result.body, { status: result.status });
      } finally {
        if (lockToken) {
          releaseLock(lockKey, lockToken).catch(() => {
            // Lock TTL (5 s) expires naturally if release fails — safe to ignore
          });
        }
      }
    },
  );
  } catch (error) {
    console.error("POST /api/reservations error:", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
