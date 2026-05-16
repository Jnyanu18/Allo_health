import { toProductDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import HeroSection from "./components/HeroSection";
import ProductGrid from "./components/ProductGrid";
import TrustBadges from "./components/TrustBadges";

export const dynamic = "force-dynamic";

async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stock: {
          include: { warehouse: true },
          orderBy: { warehouse: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    });

    return products.map(toProductDto);
  } catch {
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();

  return (
    <>
      <HeroSection />
      <ProductGrid products={products} />
      <TrustBadges />
    </>
  );
}
