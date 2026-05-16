import { notFound } from "next/navigation";
import { reservationInclude, toReservationDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import ReservationClient from "./ReservationClient";

export const dynamic = "force-dynamic";

async function getReservation(id: string) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    return reservation ? toReservationDto(reservation) : null;
  } catch {
    return null;
  }
}

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await getReservation(id);

  if (!reservation) notFound();

  return <ReservationClient initialReservation={reservation} />;
}
