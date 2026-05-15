import { Product } from "@/types";
import ProductGrid from "./components/ProductGrid";

async function getProducts(): Promise<Product[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero section */}
      <div className="mb-14 relative">
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#e8c547]/5 blur-[80px] pointer-events-none" />
        <p className="font-mono text-xs text-[#e8c547] tracking-[0.3em] mb-4 animate-fade-in">
          MULTI-WAREHOUSE INVENTORY
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[#e8e4dc] mb-4 leading-[1.1]">
          Available Products
        </h1>
        <p className="text-[#555] text-sm max-w-xl leading-relaxed">
          Stock is shown per warehouse. Reservations hold units for{" "}
          <span className="text-[#e8c547] font-mono">10 minutes</span> while you
          complete checkout. Concurrency-safe — powered by Redis locks and
          serializable transactions.
        </p>
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#55c47a] animate-pulse" />
            <span className="font-mono text-xs text-[#555]">
              {products.length} PRODUCTS AVAILABLE
            </span>
          </div>
          <span className="text-[#222]">·</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e8c547]" />
            <span className="font-mono text-xs text-[#555]">
              {products.reduce((sum, p) => sum + p.stock.length, 0)} WAREHOUSE
              ENTRIES
            </span>
          </div>
        </div>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
