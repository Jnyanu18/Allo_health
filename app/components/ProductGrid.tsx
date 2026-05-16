"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import FilterBar, { type FilterTab } from "./FilterBar";
import ProductCard from "./ProductCard";
import ReserveModal from "./ReserveModal";

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("price-asc");

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const totalAvailable = product.stock.reduce(
        (sum, stock) => sum + stock.available,
        0,
      );
      const hasLowStock = product.stock.some(
        (stock) => stock.available > 0 && stock.available <= 3,
      );
      const hasReserved = product.stock.some((stock) => stock.reserved > 0);
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filterTab === "In Stock") return totalAvailable > 0;
      if (filterTab === "Low Stock") return hasLowStock;
      if (filterTab === "Reserved") return hasReserved;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "available") {
        const aAvailable = a.stock.reduce((sum, stock) => sum + stock.available, 0);
        const bAvailable = b.stock.reduce((sum, stock) => sum + stock.available, 0);
        return bAvailable - aAvailable;
      }
      return a.price - b.price;
    });
  }, [filterTab, products, search, sort]);

  return (
    <>
      <FilterBar
        activeTab={filterTab}
        search={search}
        sort={sort}
        onTabChange={setFilterTab}
        onSearchChange={setSearch}
        onSortChange={setSort}
      />
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {visibleProducts.length === 0 ? (
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--slate-100)",
              background: "var(--white)",
              padding: 24,
              color: "var(--slate-600)",
              fontSize: 14,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            No products match the current filters.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onReserve={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </section>

      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={(reservationId) => router.push(`/reservation/${reservationId}`)}
        />
      )}
    </>
  );
}
