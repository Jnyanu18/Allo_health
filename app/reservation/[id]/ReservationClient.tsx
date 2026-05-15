"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Reservation } from "@/types";

function useCountdown(expiresAt: string, status: string) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (status !== "PENDING") return 0;
    return Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
    );
  });

  useEffect(() => {
    if (status !== "PENDING") return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  return secondsLeft;
}

function CountdownDisplay({
  seconds,
  status,
  totalDuration = 600,
}: {
  seconds: number;
  status: string;
  totalDuration?: number;
}) {
  if (status === "CONFIRMED") {
    return (
      <div className="text-center animate-scale-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] shadow-[0_0_30px_rgba(85,196,122,0.2)] mb-6">
          <div className="font-mono text-5xl font-bold text-[var(--success)]">
            ✓
          </div>
        </div>
        <h2 className="font-bold text-2xl text-[var(--text-primary)] mb-2">
          Purchase Confirmed!
        </h2>
        <p className="font-mono text-xs text-[var(--success)] tracking-widest">
          TRANSACTION SUCCESSFUL
        </p>
      </div>
    );
  }

  if (status === "RELEASED" || status === "EXPIRED") {
    return (
      <div className="text-center animate-scale-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[var(--danger-bg)] border border-[var(--danger-border)] shadow-[0_0_30px_rgba(224,85,85,0.2)] mb-6">
          <div className="font-mono text-5xl font-bold text-[var(--danger)]">
            ×
          </div>
        </div>
        <h2 className="font-bold text-2xl text-[var(--text-primary)] mb-2">
          {status === "EXPIRED" ? "Time Expired" : "Reservation Cancelled"}
        </h2>
        <p className="font-mono text-xs text-[var(--danger)] tracking-widest">
          STOCK RETURNED TO INVENTORY
        </p>
      </div>
    );
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds < 60;

  // Calculate progress percentage
  const progressPercent = Math.max(
    0,
    Math.min(100, (seconds / totalDuration) * 100),
  );

  return (
    <div className="text-center w-full max-w-sm mx-auto relative">
      <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-4">
        TIME REMAINING TO COMPLETE
      </p>

      <div
        className={`font-mono text-7xl font-bold tabular-nums transition-colors tracking-tight mb-8 \${
          isUrgent ? "text-[var(--gold)] animate-pulse shadow-[0_0_20px_rgba(232,197,71,0.2)]" : "text-gradient"
        }`}
      >
        {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>

      {/* Progress bar container */}
      <div className="h-1 w-full bg-[var(--surface-2)] rounded-full overflow-hidden mb-3 relative">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-linear \${
            isUrgent ? "bg-[var(--danger)]" : "bg-[var(--gold)]"
          }`}
          style={{ width: `\${progressPercent}%` }}
        />
      </div>

      {isUrgent && (
        <p className="font-mono text-[10px] text-[var(--warning)] tracking-widest animate-pulse">
          ACT NOW — ALMOST EXPIRED
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: {
      label: "PENDING",
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-bg)] border-[var(--warning-border)]",
    },
    CONFIRMED: {
      label: "CONFIRMED",
      color: "text-[var(--success)]",
      bg: "bg-[var(--success-bg)] border-[var(--success-border)]",
    },
    RELEASED: {
      label: "RELEASED",
      color: "text-[var(--danger)]",
      bg: "bg-[var(--danger-bg)] border-[var(--danger-border)]",
    },
  }[status] ?? {
    label: status,
    color: "text-[var(--text-secondary)]",
    bg: "bg-[var(--surface-2)] border-[var(--border-default)]",
  };

  return (
    <span
      className={`font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full border \${config.bg} \${config.color} shadow-sm`}
    >
      {config.label}
    </span>
  );
}

export default function ReservationClient({
  initialReservation,
}: {
  initialReservation: Reservation;
}) {
  const router = useRouter();
  const [reservation, setReservation] =
    useState<Reservation>(initialReservation);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const secondsLeft = useCountdown(reservation.expiresAt, reservation.status);

  // Poll for updates if pending
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/\${reservation.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setReservation(data);
      }
    } catch {
      // silent
    }
  }, [reservation.id]);

  useEffect(() => {
    if (reservation.status !== "PENDING") return;
    // Poll every 30s to sync server state
    const interval = setInterval(fetchLatest, 30000);
    return () => clearInterval(interval);
  }, [reservation.status, fetchLatest]);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);

    try {
      // Mock network delay and bypass API
      await new Promise((resolve) => setTimeout(resolve, 800));

      setReservation((prev) => ({
        ...prev,
        status: "CONFIRMED",
        confirmedAt: new Date().toISOString(),
      }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);

    try {
      // Mock network delay and bypass API
      await new Promise((resolve) => setTimeout(resolve, 800));

      setReservation((prev) => ({
        ...prev,
        status: "RELEASED",
        releasedAt: new Date().toISOString(),
      }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const isPending = reservation.status === "PENDING";
  const isExpired = isPending && secondsLeft === 0;
  const totalPrice = (reservation.productPrice ?? 0) * reservation.quantity;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Back */}
      <Link
        href="/"
        className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors inline-flex items-center gap-2 mb-8 group"
      >
        <span className="transition-transform group-hover:-translate-x-1">
          ←
        </span>{" "}
        BACK TO PRODUCTS
      </Link>

      {/* Main card */}
      <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden animate-slide-up relative">
        {/* Top glow effect based on status */}
        <div
          className={`absolute top-0 left-0 w-full h-[3px] opacity-70 \${
           reservation.status === "CONFIRMED" ? "bg-[var(--success)] shadow-[0_0_20px_rgba(85,196,122,0.5)]" :
           reservation.status === "RELEASED" || isExpired ? "bg-[var(--danger)] shadow-[0_0_20px_rgba(224,85,85,0.5)]" :
           "bg-[var(--gold)] shadow-[0_0_20px_rgba(232,197,71,0.5)] animate-shimmer"
        }`}
        />

        {/* Countdown header */}
        <div
          className={`px-8 py-14 border-b border-[var(--border-subtle)] relative overflow-hidden \${
          reservation.status === "CONFIRMED"
            ? "bg-[var(--success-bg)]/30"
            : reservation.status === "RELEASED" || isExpired
            ? "bg-[var(--danger-bg)]/30"
            : "bg-[var(--surface-0)]/50"
        }`}
        >
          {/* Subtle background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10">
            <CountdownDisplay
              seconds={secondsLeft}
              status={isExpired ? "EXPIRED" : reservation.status}
            />
          </div>
        </div>

        {/* Order details */}
        <div className="px-8 py-8 space-y-8 bg-[var(--surface-1)] relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest mb-1.5">
                RESERVING
              </p>
              <h1 className="font-bold text-[var(--text-primary)] text-2xl">
                {reservation.productName}
              </h1>
            </div>
            <StatusBadge status={isExpired ? "EXPIRED" : reservation.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-[var(--surface-0)]/50 rounded-lg border border-[var(--border-subtle)]">
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest mb-2">
                RESERVATION ID
              </p>
              <p
                className="font-mono text-[var(--text-secondary)] text-sm truncate bg-[var(--surface-2)] px-2 py-1 rounded inline-block max-w-full"
                title={reservation.id}
              >
                {reservation.id.substring(0, 12)}...
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest mb-2">
                WAREHOUSE
              </p>
              <p className="text-[var(--text-primary)] font-medium text-sm">
                {reservation.warehouseName}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest mb-2">
                QUANTITY
              </p>
              <p className="text-[var(--text-primary)] font-medium text-sm">
                {reservation.quantity} unit(s)
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest mb-2">
                EXPIRES AT
              </p>
              <p className="text-[var(--text-primary)] font-medium text-sm">
                {new Date(reservation.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Total */}
          {totalPrice > 0 && (
            <div className="bg-[var(--surface-2)] rounded-lg p-6 border border-[var(--border-default)] flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-[0.2em] block mb-1">
                  TOTAL PAYABLE
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Includes all taxes
                </span>
              </div>
              <span className="font-mono font-bold text-gradient text-3xl">
                ₹{totalPrice.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Confirmed / Released details messages */}
          {reservation.status === "CONFIRMED" && reservation.confirmedAt && (
            <div className="bg-[var(--success-bg)] border border-[var(--success-border)] px-5 py-4 rounded-lg flex items-start gap-3">
              <span className="text-[var(--success)] mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium text-[var(--success)] mb-1">
                  Payment Verified
                </p>
                <p className="font-mono text-xs text-[var(--success)]/80">
                  Confirmed at{" "}
                  {new Date(reservation.confirmedAt).toLocaleTimeString()} —
                  Thank you for your purchase.
                </p>
              </div>
            </div>
          )}

          {(reservation.status === "RELEASED" || isExpired) && (
            <div className="bg-[var(--danger-bg)] border border-[var(--danger-border)] px-5 py-4 rounded-lg flex items-start gap-3">
              <span className="text-[var(--danger)] mt-0.5">×</span>
              <div>
                <p className="text-sm font-medium text-[var(--danger)] mb-1">
                  Reservation Voided
                </p>
                <p className="font-mono text-xs text-[var(--danger)]/80">
                  This reservation has been released and units are returned to
                  general inventory.
                </p>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-4 rounded-lg animate-slide-down">
              <p className="font-mono text-xs text-[var(--danger)] leading-relaxed">
                ⚠ {error}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="px-8 py-6 border-t border-[var(--border-subtle)] bg-[var(--surface-0)] flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCancel}
              disabled={cancelling || confirming}
              className="flex-1 px-6 py-4 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] transition-all font-mono text-sm font-bold disabled:opacity-40"
            >
              {cancelling ? "CANCELLING..." : "CANCEL RESERVATION"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || cancelling}
              className="flex-[2] px-6 py-4 rounded-lg bg-[var(--gold)] text-black font-mono font-bold text-sm hover:bg-[var(--gold-hover)] hover:shadow-[0_0_20px_rgba(232,197,71,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed group"
            >
              {confirming ? (
                <span className="animate-pulse">PROCESSING PAYMENT...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  CONFIRM & PAY{" "}
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              )}
            </button>
          </div>
        )}

        {(isExpired || reservation.status === "RELEASED") && (
          <div className="px-8 py-6 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]">
            <button
              onClick={() => router.push("/")}
              className="w-full px-6 py-4 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)] transition-all font-mono text-sm font-bold group"
            >
              <span className="transition-transform group-hover:-translate-x-1 inline-block mr-2">
                ←
              </span>{" "}
              BROWSE OTHER PRODUCTS
            </button>
          </div>
        )}

        {reservation.status === "CONFIRMED" && (
          <div className="px-8 py-6 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]">
            <button
              onClick={() => router.push("/")}
              className="w-full px-6 py-4 rounded-lg bg-[var(--success)] text-black font-mono font-bold text-sm hover:bg-[#66d48a] hover:shadow-[0_0_20px_rgba(85,196,122,0.3)] transition-all group"
            >
              CONTINUE SHOPPING{" "}
              <span className="transition-transform group-hover:translate-x-1 inline-block ml-2">
                →
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
