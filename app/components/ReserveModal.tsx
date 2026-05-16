"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stockBadge } from "@/lib/stock-badge";
import type { ApiErrorResponse, Product } from "@/types";

type ReserveModalProps = {
  product: Product;
  onClose: () => void;
  onSuccess: (reservationId: string) => void;
};

export default function ReserveModal({
  product,
  onClose,
  onSuccess,
}: ReserveModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firstAvailable = product.stock.find((stock) => stock.available > 0);
    setSelectedWarehouseId(firstAvailable?.warehouseId ?? null);
    setQty(1);
    setError(null);
  }, [product]);

  const selectedWarehouse = useMemo(
    () => product.stock.find((stock) => stock.warehouseId === selectedWarehouseId),
    [product.stock, selectedWarehouseId],
  );
  const maxQty = selectedWarehouse?.available ?? 1;
  const total = qty * product.price;
  const totalAvailable = product.stock.reduce((sum, stock) => sum + stock.available, 0);

  function showError(message: string, autoHide = false) {
    setError(message);
    window.setTimeout(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
    if (autoHide) {
      window.setTimeout(() => setError(null), 4000);
    }
  }

  async function handleReserve() {
    if (!selectedWarehouse || loading) return;

    setLoading(true);
    setError(null);
    let shouldStayLoading = false;

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity: qty,
        }),
      });
      const data = (await response.json()) as ApiErrorResponse & { id?: string };

      if (response.status === 409) {
        showError(
          `Only ${data.available ?? 0} unit(s) available at ${selectedWarehouse.warehouseName}. Reduce quantity or choose a different location.`,
        );
        return;
      }

      if (response.status === 429) {
        showError("Server is busy — please try again in a moment.", true);
        return;
      }

      if (!response.ok || !data.id) {
        showError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      shouldStayLoading = true;
      onSuccess(data.id);
    } catch {
      showError("Something went wrong. Please try again.");
    } finally {
      if (!shouldStayLoading) {
        setLoading(false);
      }
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "overlayIn 200ms ease forwards",
      }}
    >
      <div
        style={{
          background: "var(--white)",
          borderRadius: "var(--radius-2xl)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-modal)",
          animation: "modalIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: "1px solid var(--slate-100)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--slate-400)",
                marginBottom: 5,
              }}
            >
              {product.sku}
            </div>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "var(--slate-900)",
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!loading) onClose();
            }}
            disabled={loading}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--slate-100)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "var(--slate-500)",
              transition: "background 150ms",
              flexShrink: 0,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "var(--slate-200)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "var(--slate-100)";
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div ref={bodyRef} style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 22,
              paddingBottom: 18,
              borderBottom: "1px solid var(--slate-100)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 4 }}>
                Unit price
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 26,
                  fontWeight: 500,
                  color: "var(--purple-800)",
                }}
              >
                ₹{product.price.toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 4 }}>
                Total available
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--green-600)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {totalAvailable} units
              </div>
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--slate-400)",
              marginBottom: 10,
            }}
          >
            Ship from
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {product.stock.map((stock) => {
              const selected = stock.warehouseId === selectedWarehouseId;
              const unavailable = stock.available === 0;
              const badge = stockBadge(stock);
              return (
                <button
                  type="button"
                  key={stock.warehouseId}
                  disabled={unavailable || loading}
                  onClick={() => {
                    setSelectedWarehouseId(stock.warehouseId);
                    setQty(1);
                    setError(null);
                  }}
                  style={{
                    border: selected
                      ? "1.5px solid var(--purple-500)"
                      : "1.5px solid var(--slate-200)",
                    borderRadius: "var(--radius-lg)",
                    padding: "12px 14px",
                    cursor: unavailable || loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 180ms ease",
                    background: unavailable
                      ? "var(--slate-50)"
                      : selected
                        ? "var(--purple-50)"
                        : "var(--white)",
                    opacity: unavailable ? 0.45 : 1,
                    position: "relative",
                    textAlign: "left",
                    gap: 14,
                  }}
                  onMouseEnter={(event) => {
                    if (!unavailable && !selected) {
                      event.currentTarget.style.borderColor = "var(--purple-200)";
                      event.currentTarget.style.background = "var(--purple-50)";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (!unavailable && !selected) {
                      event.currentTarget.style.borderColor = "var(--slate-200)";
                      event.currentTarget.style.background = "var(--white)";
                    }
                  }}
                >
                  <span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--slate-900)",
                      }}
                    >
                      {stock.warehouseName}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginTop: 2,
                      }}
                    >
                      {stock.warehouseCity}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {selected && (
                      <span style={{ color: "var(--purple-700)", fontWeight: 700 }}>
                        ✓
                      </span>
                    )}
                    <span
                      style={{
                        ...badge.style,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 500,
                        borderRadius: "var(--radius-full)",
                        padding: "2px 10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedWarehouse && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--slate-400)",
                  marginBottom: 10,
                }}
              >
                Quantity
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setQty((value) => Math.max(1, value - 1))}
                  disabled={loading || qty === 1}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1.5px solid var(--slate-200)",
                    background: "none",
                    fontSize: 20,
                    color: "var(--slate-700)",
                    fontWeight: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 150ms",
                    opacity: qty === 1 ? 0.4 : 1,
                  }}
                >
                  -
                </button>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--slate-900)",
                    minWidth: 32,
                    textAlign: "center",
                  }}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((value) => Math.min(maxQty, value + 1))}
                  disabled={loading || qty === maxQty}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1.5px solid var(--slate-200)",
                    background: "none",
                    fontSize: 20,
                    color: "var(--slate-700)",
                    fontWeight: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 150ms",
                    opacity: qty === maxQty ? 0.4 : 1,
                  }}
                >
                  +
                </button>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--slate-400)",
                    marginLeft: 4,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  max {maxQty} available
                </span>
              </div>
            </div>
          )}

          <div
            style={{
              background: "var(--purple-100)",
              border: "1px solid var(--purple-200)",
              borderRadius: "var(--radius-lg)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--purple-800)" }}>
              Order total
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 500,
                color: "var(--purple-800)",
              }}
            >
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>

          {error && (
            <div
              style={{
                background: "var(--red-50)",
                borderLeft: "3px solid var(--red-600)",
                borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                padding: "12px 14px",
                marginBottom: 14,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 16, color: "var(--red-600)", flexShrink: 0 }}>
                ⚠
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--slate-700)",
                  lineHeight: 1.55,
                }}
              >
                {error}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 14, color: "var(--slate-400)" }}>🔒</span>
            <p
              style={{
                fontSize: 12,
                color: "var(--slate-400)",
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              Units held for 10 minutes. Hold expires if payment isn&apos;t
              confirmed in time. No charge until confirmed.
            </p>
          </div>
        </div>

        <div style={{ padding: "16px 24px 24px", display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              height: 44,
              background: "var(--slate-100)",
              border: "none",
              borderRadius: "var(--radius-full)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--slate-700)",
              transition: "background 150ms",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReserve}
            disabled={!selectedWarehouse || loading}
            className="reserve-button"
            style={{ flex: 2, height: 44 }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span
                  style={{
                    display: "block",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "white",
                    animation: "spin 700ms linear infinite",
                  }}
                />
                Reserving...
              </span>
            ) : (
              "Reserve Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
