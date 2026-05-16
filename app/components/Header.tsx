import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--slate-100)",
        boxShadow: "0 1px 0 0 rgba(241,245,249,0.8)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6B21A8, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-purple-sm)",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              A
            </span>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                color: "#6B21A8",
                lineHeight: 1,
              }}
            >
              Allo Health
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--slate-400)",
                letterSpacing: "0.08em",
                marginTop: 3,
              }}
            >
              Inventory OS
            </div>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            className="live-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#059669",
              boxShadow: "0 0 0 3px rgba(5,150,105,0.20)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#059669",
              letterSpacing: "0.1em",
            }}
          >
            Live
          </span>
        </div>
      </div>
    </header>
  );
}
