export default function HeroSection() {
  return (
    <section style={{ background: "var(--slate-50)" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 40px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 3,
                height: 18,
                borderRadius: 2,
                background: "var(--purple-700)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--purple-700)",
                fontWeight: 500,
              }}
            >
              Inventory Management
            </span>
          </div>

          <h1
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "var(--slate-900)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: 14,
            }}
          >
            Reserve. Confirm. Fulfil.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--slate-500)",
              lineHeight: 1.6,
              maxWidth: 480,
            }}
          >
            Ten-minute stock holds keep checkout fair while UPI, 3DS, and wallet
            redirects finish in the background.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {[
            ["6", "Products"],
            ["3", "Warehouses"],
            ["10", "min Hold"],
          ].map(([value, label]) => (
            <div
              key={label}
              style={{
                background: "var(--white)",
                border: "1px solid var(--slate-100)",
                borderRadius: "var(--radius-full)",
                padding: "10px 18px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--purple-700)",
                }}
              >
                {value}
              </span>
              <span style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
