const badges = [
  { icon: "🔒", label: "End-to-end secure" },
  { icon: "⚡", label: "Real-time inventory" },
  { icon: "🏥", label: "3 Warehouses" },
  { icon: "✓", label: "Race-condition free" },
];

export default function TrustBadges() {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "48px auto 0",
        padding: "32px 24px 48px",
        borderTop: "1px solid var(--slate-100)",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {badges.map((badge) => (
        <div
          key={badge.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "var(--white)",
            border: "1px solid var(--slate-100)",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span style={{ fontSize: 14 }}>{badge.icon}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--slate-600)",
            }}
          >
            {badge.label}
          </span>
        </div>
      ))}
    </section>
  );
}
