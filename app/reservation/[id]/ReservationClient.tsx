"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiErrorResponse, Reservation } from "@/types";

function useCountdown(expiresAt: string, status: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (status !== "PENDING") return 0;
    return Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
    );
  });

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, status]);

  return secondsLeft;
}

function formatCountdown(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function formatTime(value: string | null) {
  if (!value) return "now";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

type VisualState = "PENDING" | "URGENT" | "CONFIRMED" | "RELEASED";

export default function ReservationClient({
  initialReservation,
}: {
  initialReservation: Reservation;
}) {
  const router = useRouter();
  const [reservation, setReservation] = useState(initialReservation);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<"confirm" | "release" | null>(null);
  const secondsLeft = useCountdown(reservation.expiresAt, reservation.status);
  const isUrgent =
    secondsLeft < 60 && secondsLeft > 0 && reservation.status === "PENDING";
  const isExpired = secondsLeft === 0 && reservation.status === "PENDING";
  const visualState: VisualState =
    reservation.status === "CONFIRMED"
      ? "CONFIRMED"
      : reservation.status === "RELEASED" || isExpired
        ? "RELEASED"
        : isUrgent
          ? "URGENT"
          : "PENDING";
  const timer = useMemo(() => formatCountdown(secondsLeft), [secondsLeft]);
  const total = reservation.quantity * reservation.productPrice;

  const fetchLatest = useCallback(async () => {
    const response = await fetch(`/api/reservations/${reservation.id}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    setReservation((await response.json()) as Reservation);
  }, [reservation.id]);

  useEffect(() => {
    if (reservation.status !== "PENDING") return;
    const interval = window.setInterval(() => {
      void fetchLatest();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchLatest, reservation.status]);

  async function handleConfirm() {
    setActing("confirm");
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      const data = (await response.json()) as Reservation & ApiErrorResponse;

      if (response.status === 410) {
        setError(
          data.expiredAt
            ? `Hold expired at ${formatTime(data.expiredAt)}. Stock returned to inventory.`
            : "Hold expired. Stock returned to inventory.",
        );
        await fetchLatest();
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setReservation(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActing(null);
    }
  }

  async function handleCancel() {
    setActing("release");
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      const data = (await response.json()) as Reservation & ApiErrorResponse;

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setReservation(data);
      await fetchLatest();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActing(null);
    }
  }

  const zoneStyles: Record<
    VisualState,
    { bg: string; border: string; label: string; labelColor: string; subtext: string; subtextColor: string }
  > = {
    PENDING: {
      bg: "linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)",
      border: "#DDD6FE",
      label: "TIME REMAINING",
      labelColor: "var(--purple-700)",
      subtext: "Hold active — complete payment before time runs out",
      subtextColor: "var(--purple-600)",
    },
    URGENT: {
      bg: "linear-gradient(135deg, #FEE2E2 0%, #FFF5F5 100%)",
      border: "#FECACA",
      label: "TIME REMAINING",
      labelColor: "var(--red-600)",
      subtext: "Hurry — your hold is almost expired!",
      subtextColor: "var(--red-600)",
    },
    CONFIRMED: {
      bg: "linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)",
      border: "#A7F3D0",
      label: "PURCHASE CONFIRMED",
      labelColor: "var(--green-600)",
      subtext: "Payment confirmed — your order is queued for dispatch",
      subtextColor: "var(--green-700)",
    },
    RELEASED: {
      bg: "linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)",
      border: "#E2E8F0",
      label: isExpired ? "RESERVATION EXPIRED" : "RESERVATION RELEASED",
      labelColor: "var(--slate-500)",
      subtext: "Hold released — units returned to inventory",
      subtextColor: "var(--slate-400)",
    },
  };
  const zone = zoneStyles[visualState];

  const statusChip =
    visualState === "CONFIRMED"
      ? {
          label: "CONFIRMED",
          bg: "var(--green-100)",
          color: "var(--green-700)",
          border: "var(--green-100)",
        }
      : visualState === "RELEASED"
        ? {
            label: isExpired ? "EXPIRED" : "RELEASED",
            bg: "var(--slate-100)",
            color: "var(--slate-500)",
            border: "var(--slate-200)",
          }
        : {
            label: "PENDING",
            bg: "var(--amber-100)",
            color: "var(--amber-700)",
            border: "var(--amber-100)",
          };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
      <button
        type="button"
        onClick={() => router.push("/")}
        style={{
          fontSize: 13,
          color: "var(--slate-400)",
          fontFamily: "var(--font-sans)",
          marginBottom: 28,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "none",
          transition: "color 180ms ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.color = "var(--purple-700)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = "var(--slate-400)";
        }}
      >
        ← Back to products
      </button>

      <section
        style={{
          background: "var(--white)",
          border: "1px solid var(--slate-100)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: zone.bg,
            borderBottom: `1px solid ${zone.border}`,
            padding: "36px 32px",
            transition: "background 600ms ease, border-color 600ms ease",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 12,
              color: zone.labelColor,
            }}
          >
            {zone.label}
          </div>
          {visualState === "CONFIRMED" ? (
            <div
              className="scale-in"
              style={{
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
                marginBottom: 10,
                fontSize: 56,
                color: "var(--green-600)",
              }}
            >
              ✓
            </div>
          ) : visualState === "RELEASED" ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
                marginBottom: 10,
                fontSize: 72,
                color: "var(--slate-300)",
              }}
            >
              —
            </div>
          ) : (
            <div
              className={visualState === "URGENT" ? "urgent-shake" : undefined}
              style={{
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
                marginBottom: 10,
                fontSize: 72,
                fontWeight: 500,
                color:
                  visualState === "URGENT"
                    ? "var(--red-700)"
                    : "var(--purple-800)",
                transition: "color 400ms ease",
              }}
            >
              {timer.minutes}
              <span className="countdown-colon">:</span>
              {timer.seconds}
            </div>
          )}
          <p
            className={visualState === "URGENT" ? "urgent-text" : undefined}
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: zone.subtextColor,
              fontWeight: visualState === "URGENT" ? 600 : 400,
            }}
          >
            {zone.subtext}
          </p>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--slate-900)",
                lineHeight: 1.2,
                flex: 1,
              }}
            >
              {reservation.productName}
            </h1>
            <span
              style={{
                flexShrink: 0,
                marginTop: 3,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${statusChip.border}`,
                background: statusChip.bg,
                color: statusChip.color,
              }}
            >
              {statusChip.label}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <DetailCell label="Reservation ID" mono value={reservation.id} truncate />
            <div>
              <DetailLabel>Warehouse</DetailLabel>
              <div style={{ fontSize: 13, color: "var(--slate-700)", fontWeight: 500 }}>
                {reservation.warehouseName}
              </div>
              <div style={{ fontSize: 11, color: "var(--slate-400)", marginTop: 2 }}>
                {reservation.warehouseCity}
              </div>
            </div>
            <DetailCell
              label="Quantity"
              value={`${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`}
            />
            <DetailCell
              label="Expires at"
              mono
              value={formatTime(reservation.expiresAt)}
            />
          </div>

          <div
            style={{
              borderTop: "1px solid var(--slate-100)",
              paddingTop: 18,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "var(--slate-400)", marginBottom: 4 }}>
                Total payable
              </div>
              {visualState === "CONFIRMED" && (
                <div style={{ fontSize: 10, color: "var(--slate-300)" }}>
                  (incl. GST)
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 32,
                fontWeight: 500,
                color: "var(--purple-800)",
                letterSpacing: "-0.01em",
              }}
            >
              ₹{total.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {visualState === "CONFIRMED" && (
          <StateBanner
            tone="success"
            text={`Confirmed at ${formatTime(reservation.confirmedAt)}. Your order has been queued for dispatch from ${reservation.warehouseName}. You will receive a confirmation shortly.`}
          />
        )}
        {visualState === "RELEASED" && (
          <StateBanner
            tone="error"
            text={
              isExpired
                ? `Hold expired at ${formatTime(reservation.expiresAt)}. Stock returned to inventory.`
                : `Hold released at ${formatTime(reservation.releasedAt)}. Stock has been returned to available inventory. Please reserve again if still interested.`
            }
          />
        )}
        {error && (
          <div
            style={{
              margin: "0 24px 16px",
              padding: "12px 14px",
              background: "var(--red-50)",
              borderLeft: "3px solid var(--red-600)",
              borderRadius: "0 var(--radius-md) var(--radius-md) 0",
              color: "var(--slate-700)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div
          style={{
            padding: "20px 24px 24px",
            borderTop: "1px solid var(--slate-100)",
            display: "flex",
            gap: 10,
          }}
        >
          {visualState === "PENDING" || visualState === "URGENT" ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={acting !== null}
                style={{
                  flex: 1,
                  height: 48,
                  background: "var(--slate-100)",
                  border: "none",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--slate-700)",
                  transition: "all 180ms ease",
                }}
              >
                {acting === "release" ? "Cancelling..." : "Cancel Hold"}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={acting !== null}
                className="reserve-button"
                style={{ flex: 2, height: 48, fontSize: 14 }}
              >
                {acting === "confirm" ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "white",
                        animation: "spin 700ms linear infinite",
                      }}
                    />
                    Processing...
                  </span>
                ) : (
                  "Confirm Purchase →"
                )}
              </button>
            </>
          ) : visualState === "CONFIRMED" ? (
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                height: 48,
                background: "linear-gradient(135deg, #047857, #059669)",
                border: "none",
                borderRadius: "var(--radius-full)",
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
              }}
            >
              Continue Shopping →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                height: 48,
                background: "var(--slate-100)",
                border: "1px solid var(--slate-200)",
                borderRadius: "var(--radius-full)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--slate-700)",
              }}
            >
              Browse Products →
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--slate-400)",
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}

function DetailCell({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div>
      <DetailLabel>{label}</DetailLabel>
      <div
        title={value}
        style={{
          fontSize: mono ? 10 : 13,
          color: mono ? "var(--slate-400)" : "var(--slate-700)",
          fontWeight: 500,
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          overflow: truncate ? "hidden" : undefined,
          textOverflow: truncate ? "ellipsis" : undefined,
          whiteSpace: truncate ? "nowrap" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StateBanner({ tone, text }: { tone: "success" | "error"; text: string }) {
  const success = tone === "success";
  return (
    <div
      style={{
        margin: "0 24px 16px",
        padding: "14px 16px",
        background: success ? "var(--green-50)" : "var(--red-50)",
        borderLeft: `3px solid ${success ? "var(--green-500)" : "var(--red-400)"}`,
        borderRadius: "0 var(--radius-md) var(--radius-md) 0",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: success ? "var(--green-100)" : "var(--red-100)",
          color: success ? "var(--green-600)" : "var(--red-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 13,
        }}
      >
        {success ? "✓" : "⚠"}
      </span>
      <p style={{ fontSize: 13, color: "var(--slate-700)", lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
}
