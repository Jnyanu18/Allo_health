"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Product, StockEntry } from "@/types";

interface ProductGridProps {
  products: Product[];
}

function StockBadge({
  available,
  total,
}: {
  available: number;
  total: number;
}) {
  if (available === 0) {
    return (
      <span className="font-mono text-xs px-2 py-0.5 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] rounded-sm">
        OUT OF STOCK
      </span>
    );
  }
  if (available <= 3) {
    return (
      <span className="font-mono text-xs px-2 py-0.5 bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)] rounded-sm animate-pulse">
        {available} LEFT
      </span>
    );
  }
  return (
    <span className="font-mono text-xs px-2 py-0.5 bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)] rounded-sm">
      {available}/{total} AVAIL
    </span>
  );
}

function ReserveModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<StockEntry | null>(
    product.stock.find((s) => s.available > 0) ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableStock = product.stock.filter((s) => s.available > 0);

  async function handleReserve() {
    if (!selectedWarehouse) return;
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = `${product.id}-${selectedWarehouse.warehouseId}-${Date.now()}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(
          `Not enough stock. Available: ${data.available ?? 0} unit(s). Requested: ${data.requested ?? quantity}.`,
        );
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Failed to create reservation");
        return;
      }

      router.push(`/reservation/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-default)] shadow-2xl animate-scale-in rounded-lg overflow-hidden relative">
        {/* Decorative top border glow */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-start justify-between bg-[var(--surface-0)]/50">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-[var(--text-muted)] mb-1.5 uppercase">
              {product.sku}
            </p>
            <h2 className="font-bold text-[var(--text-primary)] text-xl leading-tight">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-mono text-xl ml-4 w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--surface-2)]"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Price */}
          <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-md border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] text-sm font-medium">
              Unit price
            </span>
            <span className="font-mono font-bold text-gradient text-xl">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Warehouse selector */}
          <div>
            <label className="font-mono text-[10px] text-[var(--text-muted)] tracking-[0.2em] block mb-3">
              SELECT FULFILLMENT WAREHOUSE
            </label>
            {availableStock.length === 0 ? (
              <div className="p-4 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-md">
                <p className="text-[var(--danger)] text-sm font-mono text-center">
                  NO STOCK AVAILABLE
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {product.stock.map((s) => (
                  <button
                    key={s.warehouseId}
                    onClick={() => s.available > 0 && setSelectedWarehouse(s)}
                    disabled={s.available === 0}
                    className={`w-full text-left px-4 py-3 rounded-md transition-all group relative overflow-hidden ${
                      selectedWarehouse?.warehouseId === s.warehouseId
                        ? "border-[var(--gold)] bg-[var(--warning-bg)] border shadow-[0_0_15px_rgba(232,197,71,0.1)]"
                        : s.available === 0
                          ? "border-[var(--surface-2)] opacity-40 cursor-not-allowed border"
                          : "border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)] border cursor-pointer"
                    }`}
                  >
                    {selectedWarehouse?.warehouseId === s.warehouseId && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--gold)]/5 to-transparent opacity-50" />
                    )}
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p
                          className={`font-mono text-sm font-bold ${
                            selectedWarehouse?.warehouseId === s.warehouseId
                              ? "text-[var(--gold)]"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {s.warehouseName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {s.warehouseLocation}
                        </p>
                      </div>
                      <StockBadge available={s.available} total={s.total} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          {selectedWarehouse && (
            <div>
              <label className="font-mono text-[10px] text-[var(--text-muted)] tracking-[0.2em] block mb-3">
                QUANTITY
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-2)] hover:text-[var(--gold)] transition-colors font-mono"
                  >
                    −
                  </button>
                  <span className="font-mono text-lg w-10 text-center bg-[var(--surface-2)] h-10 flex items-center justify-center border-x border-[var(--border-default)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(
                        Math.min(selectedWarehouse.available, quantity + 1),
                      )
                    }
                    className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-2)] hover:text-[var(--gold)] transition-colors font-mono"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  max limit:{" "}
                  <span className="text-[var(--text-primary)]">
                    {selectedWarehouse.available}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 rounded-md animate-slide-down">
              <p className="font-mono text-xs text-[var(--danger)]">
                ⚠ {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]">
          {/* Total Preview */}
          {selectedWarehouse && (
            <div className="flex items-center justify-between mb-5 px-2">
              <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest">
                TOTAL AMOUNT
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)] text-2xl">
                ₹{(product.price * quantity).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)] transition-all font-mono text-sm"
            >
              CANCEL
            </button>
            <button
              onClick={handleReserve}
              disabled={
                !selectedWarehouse || loading || availableStock.length === 0
              }
              className="flex-1 px-4 py-3 rounded-md bg-[var(--gold)] text-black font-mono font-bold text-sm hover:bg-[var(--gold-hover)] hover:shadow-[0_0_20px_rgba(232,197,71,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed relative overflow-hidden group"
            >
              {loading ? (
                <span className="animate-pulse">RESERVING...</span>
              ) : (
                <span className="relative z-10 flex items-center justify-center gap-2">
                  RESERVE NOW{" "}
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onReserve,
  index,
}: {
  product: Product;
  onReserve: (p: Product) => void;
  index: number;
}) {
  const totalAvailable = product.stock.reduce((sum, s) => sum + s.available, 0);
  const isOutOfStock = totalAvailable === 0;

  return (
    <div
      className="card-hover bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl overflow-hidden flex flex-col relative animate-slide-up"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-[var(--surface-2)] overflow-hidden relative group">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[var(--text-muted)] text-xs">
              {product.sku}
            </span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-1)] via-transparent to-transparent opacity-60" />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px]">
            <span className="font-mono text-xs text-[var(--danger)] border border-[var(--danger)] px-4 py-1.5 bg-[var(--danger-bg)]/80 rounded-sm shadow-lg">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1 relative z-10">
        <div className="mb-4">
          <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest mb-1.5 uppercase">
            {product.sku}
          </p>
          <h3 className="font-bold text-[var(--text-primary)] text-lg leading-snug mb-2 group-hover:text-gradient transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Stock per warehouse */}
        <div className="space-y-2 mb-6 flex-1 bg-[var(--surface-0)]/50 p-3 rounded-md border border-[var(--border-subtle)]">
          <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-3">
            STOCK AVAILABILITY
          </p>
          {product.stock.map((s) => (
            <div
              key={s.warehouseId}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-[var(--text-secondary)] font-medium">
                {s.warehouseName}
              </span>
              <StockBadge available={s.available} total={s.total} />
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-subtle)]">
          <span className="font-mono font-bold text-gradient text-xl">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          <button
            onClick={() => !isOutOfStock && onReserve(product)}
            disabled={isOutOfStock}
            className="font-mono text-xs px-5 py-2.5 rounded-md bg-[var(--gold)] text-black font-bold hover:bg-[var(--gold-hover)] hover:shadow-[0_0_15px_rgba(232,197,71,0.4)] transition-all disabled:opacity-20 disabled:hover:shadow-none disabled:cursor-not-allowed group/btn"
          >
            <span className="flex items-center gap-1.5">
              RESERVE{" "}
              <span className="transition-transform group-hover/btn:translate-x-1">
                →
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ products }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <>
      {products.length === 0 ? (
        <div className="text-center py-32 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl border-dashed">
          <p className="text-[var(--text-muted)] font-mono text-sm mb-4">
            NO PRODUCTS FOUND
          </p>
          <p className="text-[var(--text-secondary)] text-sm">
            Run the seed script to populate the database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              onReserve={setSelectedProduct}
              index={idx}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
