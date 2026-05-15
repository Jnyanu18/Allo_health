import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      stock: product.inventory.map((i: any) => ({
        warehouseId: i.warehouseId,
        warehouseName: i.warehouse.name,
        warehouseLocation: i.warehouse.location,
        total: i.totalUnits,
        reserved: i.reservedUnits,
        available: Math.max(0, i.totalUnits - i.reservedUnits),
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
