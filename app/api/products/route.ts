import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProductDto } from "@/lib/dto";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      stock: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products.map(toProductDto), {
    headers: { "Cache-Control": "no-store" },
  });
}
