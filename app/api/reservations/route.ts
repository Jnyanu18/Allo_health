import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquireLock, releaseLock } from "@/lib/redis";
import { CreateReservationSchema } from "@/lib/schemas";
import { withIdempotency } from "@/lib/idempotency";
import { lazyExpireForProduct } from "@/lib/expiry";

const RESERVATION_TTL_MINUTES = 10;

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key");

  return withIdempotency(idempotencyKey, "POST:/api/reservations", async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // First, lazily expire any stale reservations for this SKU/warehouse
    await lazyExpireForProduct(productId, warehouseId);

    // Acquire a distributed lock scoped to this product+warehouse combination
    // This ensures only one reservation request proceeds at a time for the same stock
    const lockKey = `stock:${productId}:${warehouseId}`;
    const lockToken = await acquireLock(lockKey, 8000); // 8s lock TTL

    if (!lockToken) {
      return NextResponse.json(
        { error: "Another reservation is in progress. Please try again." },
        { status: 429 },
      );
    }

    try {
      // Use a serializable transaction to check and decrement stock atomically
      const result = await prisma.$transaction(
        async (tx: any) => {
          // Lock the stock row and read current values
          const stock = await tx.stock.findUnique({
            where: {
              productId_warehouseId: { productId, warehouseId },
            },
          });

          if (!stock) {
            return { error: "Stock record not found", status: 404 } as const;
          }

          const available = stock.total - stock.reserved;

          if (available < quantity) {
            return {
              error: "Insufficient stock",
              available,
              requested: quantity,
              status: 409,
            } as const;
          }

          // Increment reserved count
          await tx.stock.update({
            where: {
              productId_warehouseId: { productId, warehouseId },
            },
            data: { reserved: { increment: quantity } },
          });

          // Create the reservation
          const expiresAt = new Date();
          expiresAt.setMinutes(
            expiresAt.getMinutes() + RESERVATION_TTL_MINUTES,
          );

          const reservation = await tx.reservation.create({
            data: {
              productId,
              warehouseId,
              quantity,
              status: "PENDING",
              expiresAt,
            },
            include: {
              product: true,
              warehouse: true,
            },
          });

          return { reservation, status: 201 } as const;
        },
        {
          isolationLevel: "Serializable",
          timeout: 7000,
        },
      );

      if ("error" in result) {
        const { status, ...rest } = result;
        return NextResponse.json(rest, { status });
      }

      const { reservation } = result;
      return NextResponse.json(
        {
          id: reservation.id,
          productId: reservation.productId,
          productName: reservation.product.name,
          warehouseId: reservation.warehouseId,
          warehouseName: reservation.warehouse.name,
          quantity: reservation.quantity,
          status: reservation.status,
          expiresAt: reservation.expiresAt.toISOString(),
          createdAt: reservation.createdAt.toISOString(),
        },
        { status: 201 },
      );
    } finally {
      await releaseLock(lockKey, lockToken);
    }
  });
}
