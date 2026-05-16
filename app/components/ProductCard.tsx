"use client";

import { stockBadge } from "@/lib/stock-badge";
import type { Product } from "@/types";

const categoryVisuals: Record<
  string,
  { bg: string; iconColor: string; borderColor: string }
> = {
  Diagnostic: {
    bg: "linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)",
    iconColor: "#6B21A8",
    borderColor: "#DDD6FE",
  },
  Supplement: {
    bg: "linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)",
    iconColor: "#047857",
    borderColor: "#A7F3D0",
  },
  Topical: {
    bg: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)",
    iconColor: "#B45309",
    borderColor: "#FDE68A",
  },
};

function getCategoryVisual(category: string) {
  return categoryVisuals[category] ?? categoryVisuals.Diagnostic;
}

type ProductCardProps = {
  product: Product;
  onReserve: (product: Product) => void;
};

export default function ProductCard({ product, onReserve }: ProductCardProps) {
  const visual = getCategoryVisual(product.category);
  const totalAvailable = product.stock.reduce((sum, item) => sum + item.available, 0);
  const hasReserved = product.stock.some((item) => item.reserved > 0);

  return (
    <article
      className="product-card"
      style={{
        background: "var(--white)",
        border: "1px solid var(--slate-100)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-sm)",
        transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = "#EDE9FE";
        event.currentTarget.style.boxShadow =
          "0 8px 24px rgba(107,33,168,0.10), 0 2px 8px rgba(0,0,0,0.06)";
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "var(--slate-100)";
        event.currentTarget.style.boxShadow = "var(--shadow-sm)";
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          height: 168,
          background: visual.bg,
          borderBottom: `1px solid ${visual.borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.65), rgba(255,255,255,0) 58%)",
          }}
        />
        <span
          style={{
            position: "relative",
            fontSize: 52,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.10))",
            color: visual.iconColor,
          }}
          aria-hidden
        >
          {product.imageUrl ?? "🧪"}
        </span>
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.85)",
            color: visual.iconColor,
            border: `1px solid ${visual.borderColor}`,
            backdropFilter: "blur(4px)",
          }}
        >
          {product.category}
        </span>
        {hasReserved && (
          <span
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              borderRadius: "var(--radius-full)",
              background: "var(--amber-100)",
              color: "var(--amber-700)",
              padding: "3px 9px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            Held
          </span>
        )}
        {totalAvailable === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(2px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                padding: "6px 14px",
                background: "var(--red-50)",
                border: "1px solid var(--red-100)",
                borderRadius: "var(--radius-full)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                letterSpacing: "0.1em",
                color: "var(--red-700)",
                textTransform: "uppercase",
              }}
            >
              Unavailable
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: "18px 18px 0", flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--slate-400)",
            marginBottom: 6,
          }}
        >
          {product.sku}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--slate-900)",
            lineHeight: 1.3,
            marginBottom: 6,
            minHeight: 40,
          }}
        >
          {product.name}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--slate-500)",
            lineHeight: 1.55,
            marginBottom: 14,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 38,
          }}
        >
          {product.description}
        </p>

        <div
          style={{
            borderTop: "1px solid var(--slate-100)",
            paddingTop: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--slate-400)",
              marginBottom: 8,
            }}
          >
            Stock by warehouse
          </div>
          <div>
            {product.stock.map((stock, index) => {
              const badge = stockBadge(stock);
              return (
                <div
                  key={stock.warehouseId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom:
                      index === product.stock.length - 1
                        ? "none"
                        : "1px dashed var(--slate-100)",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--slate-600)",
                      fontWeight: 500,
                    }}
                  >
                    {stock.warehouseName}
                  </span>
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--slate-100)",
          padding: "14px 18px 18px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "var(--slate-400)", marginBottom: 2 }}>
            Starting from
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 20,
              fontWeight: 500,
              color: "var(--purple-800)",
              letterSpacing: "-0.01em",
            }}
          >
            ₹{product.price.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 10, color: "var(--slate-400)", marginTop: 1 }}>
            incl. GST
          </div>
        </div>
        <button
          type="button"
          disabled={totalAvailable === 0}
          onClick={() => onReserve(product)}
          className="reserve-button"
          style={{ padding: "9px 20px" }}
        >
          Reserve
        </button>
      </div>
    </article>
  );
}
