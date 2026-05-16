import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, state: true },
  });

  return NextResponse.json(warehouses, {
    headers: { "Cache-Control": "no-store" },
  });
}
