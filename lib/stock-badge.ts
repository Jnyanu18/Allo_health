import type { StockEntry } from "@/types";

export function stockBadge(stock: StockEntry) {
  if (stock.available <= 0) {
    return {
      text: "SOLD OUT",
      style: { background: "var(--red-100)", color: "var(--red-700)" },
    };
  }
  if (stock.available <= 3) {
    return {
      text: `${stock.available} LEFT ⚠`,
      style: { background: "var(--amber-100)", color: "var(--amber-700)" },
    };
  }
  return {
    text: `${stock.available} AVAIL`,
    style: { background: "var(--green-100)", color: "var(--green-700)" },
  };
}
