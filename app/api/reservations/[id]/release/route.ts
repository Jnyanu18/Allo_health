import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { product: true, warehouse: true },
      });

      if (!reservation) {
        return { error: "Reservation not found", status: 404 } as const;
      }

      if (reservation.status === "released") {
        return { reservation, status: 200 } as const; // idempotent
      }

      if (reservation.status === "confirmed") {
        return {
          error: "Cannot release a confirmed reservation",
          status: 409,
        } as const;
      }

      // Release: restore reserved count
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reservedUnits: { decrement: reservation.quantity } },
      });

      const released = await tx.reservation.update({
        where: { id },
        data: { status: "released", releasedAt: new Date() },
        include: { product: true, warehouse: true },
      });

      return { reservation: released, status: 200 } as const;
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
      releasedAt: reservation.releasedAt?.toISOString(),
    });
  } catch (error) {
    console.error(`POST /api/reservations/${id}/release error:`, error);
    return NextResponse.json(
      { error: "Failed to release reservation" },
      { status: 500 },
    );
  }
}
