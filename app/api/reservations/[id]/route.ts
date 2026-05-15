import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      productSku: reservation.product.sku,
      productPrice: Number(reservation.product.price),
      warehouseId: reservation.warehouseId,
      warehouseName: reservation.warehouse.name,
      warehouseLocation: reservation.warehouse.location,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString(),
      confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
      releasedAt: reservation.releasedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
    });
  } catch (error) {
    console.error(`GET /api/reservations/${id} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 },
    );
  }
}
