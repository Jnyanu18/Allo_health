import { Reservation } from "@/types";
import ReservationClient from "./ReservationClient";
import { notFound } from "next/navigation";

async function getReservation(id: string): Promise<Reservation> {
  // Mock data for previewing frontend without a database
  return {
    id: id || "res_12345",
    productId: "prod_1",
    productName: "Tadalafil 10mg",
    productPrice: 499,
    warehouseId: "w1",
    warehouseName: "Mumbai Central",
    quantity: 1,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString(), // Expires in 10 minutes
    confirmedAt: null,
    releasedAt: null,
    createdAt: new Date().toISOString(),
  };
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
