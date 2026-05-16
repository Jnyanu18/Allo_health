"use client";

const tabs = ["All", "In Stock", "Low Stock", "Reserved"] as const;

export type FilterTab = (typeof tabs)[number];

type FilterBarProps = {
  activeTab: FilterTab;
  search: string;
  sort: string;
  onTabChange: (tab: FilterTab) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
};

export default function FilterBar({
  activeTab,
  search,
  sort,
  onTabChange,
  onSearchChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <div
      style={{
        background: "var(--white)",
        borderBottom: "1px solid var(--slate-100)",
        position: "sticky",
        top: 64,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 52,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              style={{
                padding: "14px 16px",
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 500,
                fontFamily: "var(--font-sans)",
                color:
                  activeTab === tab ? "var(--purple-700)" : "var(--slate-500)",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--purple-700)"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all 200ms ease",
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: "var(--slate-400)",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search SKU or product"
              style={{
                width: 200,
                height: 36,
                padding: "0 12px 0 36px",
                border: "1px solid var(--slate-200)",
                borderRadius: "var(--radius-full)",
                background: "var(--slate-50)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                color: "var(--slate-700)",
                outline: "none",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = "#7C3AED";
              }}
              onBlur={(event) => {
                event.target.style.borderColor = "var(--slate-200)";
              }}
            />
          </div>

          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            style={{
              height: 36,
              padding: "0 32px 0 12px",
              border: "1px solid var(--slate-200)",
              borderRadius: "var(--radius-full)",
              background: "var(--slate-50)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: "var(--slate-700)",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
            }}
          >
            <option value="price-asc">Lowest price</option>
            <option value="price-desc">Highest price</option>
            <option value="name">Name A-Z</option>
            <option value="available">Stock: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
