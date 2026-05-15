import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Lazily expire stale reservations for this product/warehouse to free up stock
    await lazyExpireForProduct(productId, warehouseId);

    // Use a transaction with row-level locking (SELECT FOR UPDATE) to prevent race conditions
    const result = await prisma.$transaction(
      async (tx: any) => {
        // 1. SELECT inventory row FOR UPDATE
        const inventoryRows: any[] = await tx.$queryRaw`
          SELECT id, "productId", "warehouseId", "totalUnits", "reservedUnits"
          FROM "Inventory"
          WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        const inventory = inventoryRows[0];

        if (!inventory) {
          return { error: "Inventory record not found", status: 404 } as const;
        }

        // 2. Compute available stock
        const available = inventory.totalUnits - inventory.reservedUnits;

        // 3. If available < requested quantity, return 409
        if (available < quantity) {
          return {
            error: "Insufficient stock",
            available,
            requested: quantity,
            status: 409,
          } as const;
        }

        // 4. Otherwise, increment reservedUnits and create reservation
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { reservedUnits: { increment: quantity } },
        });

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_TTL_MINUTES);

        const reservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: "pending",
            expiresAt,
          },
          include: {
            product: true,
            warehouse: true,
          },
        });

        // 5. Commit transaction occurs implicitly
        return { reservation, status: 201 } as const;
      },
      {
        // Standard ReadCommitted is sufficient since we use explicit row locking
        isolationLevel: "ReadCommitted", 
        timeout: 10000,
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
  });
}
