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
      <div className="mb-14 border-b border-[var(--border-subtle)] pb-10">
        <div className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--gold)] mb-6 tracking-wide uppercase">
          Multi-Warehouse Inventory System
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
          Medical Products Inventory
        </h1>
        <p className="text-[var(--text-secondary)] text-base max-w-2xl leading-relaxed">
          Real-time stock levels across all our warehouses. Reservations
          securely hold units for
          <span className="font-semibold text-[var(--gold)]">
            {" "}
            10 minutes
          </span>{" "}
          while you complete checkout.
        </p>
        <div className="mt-8">
          <a
            href="/test-concurrency"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--gold)] text-[var(--gold)] font-mono text-sm font-bold hover:bg-[var(--gold)] hover:text-black transition-colors"
          >
            ⚡ RUN CONCURRENCY TEST
          </a>
        </div>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
