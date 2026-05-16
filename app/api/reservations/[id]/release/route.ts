import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Atomic: only releases if PENDING
      const updated = await tx.reservation.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "RELEASED", releasedAt: now },
      });

      if (updated.count === 0) {
        const existing = await tx.reservation.findUnique({ where: { id } });

        if (!existing) {
          return { status: 404 as const, body: { error: "Reservation not found" } };
        }

        if (existing.status === "RELEASED") {
          return {
            status: 200 as const,
            body: { id: existing.id, status: existing.status, releasedAt: existing.releasedAt?.toISOString() ?? null },
          };
        }

        return { status: 409 as const, body: { error: "Cannot release a confirmed reservation" } };
      }

      // Fetch to get productId/warehouseId/quantity for stock update
      const released = await tx.reservation.findUnique({ where: { id } });

      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: released!.productId,
            warehouseId: released!.warehouseId,
          },
        },
        data: { reserved: { decrement: released!.quantity } },
      });

      return {
        status: 200 as const,
        body: { id: released!.id, status: released!.status, releasedAt: released!.releasedAt?.toISOString() ?? null },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("POST release error:", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
