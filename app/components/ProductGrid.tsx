"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Product, StockEntry } from "@/types";

interface ProductGridProps {
  products: Product[];
}

// ─────────────────────────── Toast ───────────────────────────────────────────

interface Toast {
  id: number;
  type: "success" | "error" | "warning";
  message: string;
}

let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm max-w-sm animate-slide-up ${
            t.type === "success"
              ? "bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]"
              : t.type === "error"
              ? "bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]"
              : "bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning)]"
          }`}
        >
          <span className="mt-0.5 text-base leading-none">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "⚠"}
          </span>
          <span className="flex-1 font-medium">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 font-bold text-xs"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

// ─────────────────────────── Stock components ─────────────────────────────────

function InventoryBar({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-mono font-semibold text-[var(--text-primary)]">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StockBadge({ available, total }: { available: number; total: number }) {
  if (available === 0)
    return <span className="text-xs px-2 py-0.5 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] rounded font-semibold">Out of stock</span>;
  if (available <= 3)
    return <span className="text-xs px-2 py-0.5 bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)] rounded font-semibold animate-pulse">{available} left</span>;
  return <span className="text-xs px-2 py-0.5 bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)] rounded font-semibold">{available}/{total} avail</span>;
}

// ─────────────────────────── Reserve Modal ────────────────────────────────────

function ReserveModal({
  product,
  onClose,
  onSuccess,
  onError,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
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
        const msg = `Not enough stock. Available: ${data.available ?? 0} unit(s).`;
        setError(msg);
        onError(msg);
        return;
      }

      if (!res.ok) {
        const msg = data.error ?? "Failed to create reservation";
        setError(msg);
        onError(msg);
        return;
      }

      onSuccess(`Reserved ${quantity}× ${product.name}. You have 10 minutes to confirm.`);
      onClose();
      router.refresh(); // Live stock update — Feature 4
      router.push(`/reservation/${data.id}`);
    } catch {
      const msg = "Network error. Please try again.";
      setError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-default)] shadow-2xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider mb-1">{product.sku}</p>
            <h2 className="font-bold text-[var(--text-primary)] text-lg">{product.name}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)] transition-colors text-lg">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Price */}
          <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg">
            <span className="text-sm text-[var(--text-secondary)]">Unit price</span>
            <span className="font-mono font-bold text-[var(--gold)] text-xl">₹{product.price.toLocaleString("en-IN")}</span>
          </div>

          {/* Warehouse selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Fulfillment Warehouse
            </label>
            {availableStock.length === 0 ? (
              <div className="p-4 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-center text-sm text-[var(--danger)]">
                No stock available in any warehouse
              </div>
            ) : (
              <div className="space-y-2">
                {product.stock.map((s) => (
                  <button
                    key={s.warehouseId}
                    onClick={() => s.available > 0 && setSelectedWarehouse(s)}
                    disabled={s.available === 0}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      selectedWarehouse?.warehouseId === s.warehouseId
                        ? "border-[var(--gold)] bg-[var(--warning-bg)]"
                        : s.available === 0
                        ? "border-[var(--border-subtle)] opacity-40 cursor-not-allowed"
                        : "border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--surface-0)] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-semibold ${selectedWarehouse?.warehouseId === s.warehouseId ? "text-[var(--gold)]" : "text-[var(--text-primary)]"}`}>
                          {s.warehouseName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{s.warehouseLocation}</p>
                      </div>
                      <StockBadge available={s.available} total={s.total} />
                    </div>
                    {/* Inventory bars */}
                    <div className="mt-3 space-y-1.5">
                      <InventoryBar label="Available" value={s.available} max={s.total} colorClass="bg-[var(--success)]" />
                      <InventoryBar label="Reserved" value={s.reserved} max={s.total} colorClass="bg-[var(--warning)]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          {selectedWarehouse && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg overflow-hidden">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors">−</button>
                  <span className="w-10 h-10 flex items-center justify-center font-mono font-bold border-x border-[var(--border-default)] bg-[var(--surface-2)]">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(selectedWarehouse.available, quantity + 1))} className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors">+</button>
                </div>
                <span className="text-xs text-[var(--text-muted)]">Max: {selectedWarehouse.available}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-sm text-[var(--danger)] font-medium">
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleReserve}
            disabled={loading || !selectedWarehouse || availableStock.length === 0}
            className="w-full py-3 rounded-lg bg-[var(--gold)] text-white font-semibold text-sm hover:bg-[var(--gold-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Reserving...
              </span>
            ) : `Hold ${quantity} unit${quantity > 1 ? "s" : ""} for 10 minutes`}
          </button>

          <p className="text-xs text-[var(--text-muted)] text-center">
            Reservation holds stock for <span className="font-semibold text-[var(--gold)]">10 minutes</span>. Unreserved stock returns automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Product Card ─────────────────────────────────────

function ProductCard({ product, onReserve, index }: { product: Product; onReserve: (p: Product) => void; index: number }) {
  const totalAvailable = product.stock.reduce((sum, s) => sum + s.available, 0);
  const totalReserved = product.stock.reduce((sum, s) => sum + s.reserved, 0);
  const totalUnits = product.stock.reduce((sum, s) => sum + s.total, 0);
  const isOutOfStock = totalAvailable === 0;

  return (
    <div
      className="bg-[var(--surface-0)] border border-[var(--border-default)] rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-[var(--surface-2)] overflow-hidden relative">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-300 hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[var(--text-muted)] text-xs font-mono">{product.sku.slice(0, 6)}</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-[var(--surface-0)]/70 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-xs font-bold text-[var(--danger)] border border-[var(--danger)] px-3 py-1.5 bg-[var(--surface-0)] rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider mb-1">{product.sku}</p>
        <h3 className="font-bold text-[var(--text-primary)] text-base leading-snug mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-3">{product.description}</p>
        )}

        {/* ── Inventory Visualization ── */}
        <div className="my-3 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Stock</span>
            <StockBadge available={totalAvailable} total={totalUnits} />
          </div>
          <InventoryBar label="Available" value={totalAvailable} max={totalUnits} colorClass="bg-[var(--success)]" />
          {totalReserved > 0 && (
            <InventoryBar label="Reserved (held)" value={totalReserved} max={totalUnits} colorClass="bg-[var(--warning)]" />
          )}
          {/* Per-warehouse breakdown */}
          {product.stock.length > 1 && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
              {product.stock.map((s) => (
                <div key={s.warehouseId} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)] truncate">{s.warehouseName}</span>
                  <span className={`font-mono font-semibold ml-2 shrink-0 ${s.available === 0 ? "text-[var(--danger)]" : s.available <= 3 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                    {s.available}/{s.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-[var(--text-primary)] text-lg">₹{product.price.toLocaleString("en-IN")}</span>
          </div>
          <button
            onClick={() => !isOutOfStock && onReserve(product)}
            disabled={isOutOfStock}
            className="px-4 py-2 rounded-lg bg-[var(--gold)] text-white text-sm font-semibold hover:bg-[var(--gold-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isOutOfStock ? "Unavailable" : "Reserve"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Main Grid ───────────────────────────────────────

export default function ProductGrid({ products }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toasts, show, dismiss } = useToast();

  return (
    <>
      {products.length === 0 ? (
        <div className="text-center py-32 bg-[var(--surface-1)] border border-dashed border-[var(--border-default)] rounded-xl">
          <p className="text-[var(--text-muted)] text-sm mb-2">No products found</p>
          <p className="text-xs text-[var(--text-secondary)]">Run <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded">npm run db:seed</code> to populate the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} onReserve={setSelectedProduct} index={idx} />
          ))}
        </div>
      )}

      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={(msg) => show("success", msg)}
          onError={(msg) => show("error", msg)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
