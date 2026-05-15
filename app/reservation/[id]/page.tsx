import { Reservation } from "@/types";
import ReservationClient from "./ReservationClient";
import { notFound } from "next/navigation";

async function getReservation(id: string): Promise<Reservation> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/reservations/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error("Failed to fetch reservation");
  return res.json();
}

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await getReservation(id);

  return <ReservationClient initialReservation={reservation} />;
}
