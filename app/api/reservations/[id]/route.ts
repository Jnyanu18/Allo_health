import { NextResponse } from "next/server";
import { reservationInclude, toReservationDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json(toReservationDto(reservation), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET reservation error:", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
