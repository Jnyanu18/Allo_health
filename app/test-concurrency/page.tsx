"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/types";

interface TestResult {
  requestId: number;
  status: number;
  body: Record<string, unknown>;
  durationMs: number;
}

interface TestSummary {
  total: number;
  succeeded: number;
  failed409: number;
  otherErrors: number;
  totalDurationMs: number;
  results: TestResult[];
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full bg-[var(--surface-3)] rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ConcurrencyTestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [concurrency, setConcurrency] = useState(50);
  const [quantity, setQuantity] = useState(1);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProductId(data[0].id);
          const firstAvailable = data[0].stock.find((s) => s.available > 0);
          if (firstAvailable) setSelectedWarehouseId(firstAvailable.warehouseId);
        }
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedStock = selectedProduct?.stock.find(
    (s) => s.warehouseId === selectedWarehouseId,
  );

  async function runTest() {
    if (!selectedProductId || !selectedWarehouseId) return;
    setRunning(true);
    setSummary(null);

    const start = Date.now();

    const requests = Array.from({ length: concurrency }, (_, i) =>
      (async (): Promise<TestResult> => {
        const reqStart = Date.now();
        try {
          const res = await fetch("/api/reservations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Unique key per request — no idempotency deduplication
              "Idempotency-Key": `browser-test-${selectedProductId}-${selectedWarehouseId}-req${i}-${Date.now()}-${Math.random()}`,
            },
            body: JSON.stringify({
              productId: selectedProductId,
              warehouseId: selectedWarehouseId,
              quantity,
            }),
          });
          const body = await res.json();
          return { requestId: i + 1, status: res.status, body, durationMs: Date.now() - reqStart };
        } catch (err) {
          return {
            requestId: i + 1,
            status: 0,
            body: { error: String(err) },
            durationMs: Date.now() - reqStart,
          };
        }
      })(),
    );

    const results = await Promise.all(requests);
    const totalDurationMs = Date.now() - start;

    setSummary({
      total: results.length,
      succeeded: results.filter((r) => r.status === 201).length,
      failed409: results.filter((r) => r.status === 409).length,
      otherErrors: results.filter((r) => r.status !== 201 && r.status !== 409).length,
      totalDurationMs,
      results: results.sort((a, b) => a.requestId - b.requestId),
    });

    setRunning(false);
  }

  const passed =
    summary !== null &&
    summary.succeeded === 1 &&
    summary.failed409 === concurrency - 1 &&
    summary.otherErrors === 0;

  const failed =
    summary !== null && (summary.succeeded > 1 || summary.otherErrors > 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors inline-flex items-center gap-2 mb-6"
        >
          ← Back to Products
        </Link>
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--gold)] tracking-wide uppercase">
            Live Proof
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
          Concurrency Test
        </h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Fire simultaneous reservation requests from the browser. If inventory has 1 available unit,
          exactly <strong>one</strong> request should succeed and all others should receive{" "}
          <code className="text-[var(--gold)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-xs">
            HTTP 409
          </code>
          . This proves{" "}
          <code className="text-[var(--gold)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-xs">
            SELECT FOR UPDATE
          </code>{" "}
          prevents overselling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-6 space-y-6">
          <h2 className="font-semibold text-[var(--text-primary)] text-lg">Test Configuration</h2>

          {/* Product */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Product
            </label>
            {loadingProducts ? (
              <div className="h-10 bg-[var(--surface-2)] rounded animate-pulse" />
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((p) => p.id === e.target.value);
                  const first = p?.stock.find((s) => s.available > 0);
                  setSelectedWarehouseId(first?.warehouseId ?? p?.stock[0]?.warehouseId ?? "");
                }}
                className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Warehouse
            </label>
            {loadingProducts ? (
              <div className="h-10 bg-[var(--surface-2)] rounded animate-pulse" />
            ) : (
              <div className="space-y-2">
                {(selectedProduct?.stock ?? []).map((s) => (
                  <button
                    key={s.warehouseId}
                    onClick={() => setSelectedWarehouseId(s.warehouseId)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      selectedWarehouseId === s.warehouseId
                        ? "border-[var(--gold)] bg-[var(--warning-bg)]"
                        : "border-[var(--border-default)] bg-[var(--surface-0)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-[var(--text-primary)]">{s.warehouseName}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">{s.warehouseLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold ${s.available === 0 ? "text-[var(--danger)]" : s.available <= 3 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                          {s.available} avail
                        </span>
                        <span className="text-[var(--text-faint)]">/ {s.total} total</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Concurrency + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Simultaneous Requests
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={concurrency}
                onChange={(e) => setConcurrency(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Units Per Request
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[var(--surface-0)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
              />
            </div>
          </div>

          {/* Current stock state */}
          {selectedStock && (
            <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border-subtle)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Current Inventory State
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Total Units</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{selectedStock.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Reserved</span>
                  <span className="font-mono font-bold text-[var(--warning)]">{selectedStock.reserved}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Available</span>
                  <span className={`font-mono font-bold ${selectedStock.available === 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                    {selectedStock.available}
                  </span>
                </div>
                <ProgressBar
                  value={selectedStock.available}
                  max={selectedStock.total}
                  color="bg-[var(--success)]"
                />
              </div>
              {selectedStock.available <= 1 && (
                <p className="mt-3 text-xs text-[var(--warning)] font-semibold">
                  ⚡ With {selectedStock.available} available unit and {concurrency} requests, expect 1 success + {concurrency - 1} × 409.
                </p>
              )}
            </div>
          )}

          <button
            onClick={runTest}
            disabled={running || !selectedProductId || !selectedWarehouseId}
            className="w-full py-3 rounded-lg bg-[var(--gold)] text-white font-semibold text-sm hover:bg-[var(--gold-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running {concurrency} requests...
              </span>
            ) : (
              `Run Concurrency Test (${concurrency} requests)`
            )}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!summary && !running && (
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <p className="font-semibold text-[var(--text-primary)] mb-2">Ready to test</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Configure the test parameters and click Run to fire simultaneous requests.
              </p>
            </div>
          )}

          {running && (
            <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-8 text-center">
              <div className="text-4xl mb-4 animate-pulse">🔄</div>
              <p className="font-semibold text-[var(--text-primary)] mb-2">
                Firing {concurrency} simultaneous requests...
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                All requests are running concurrently via Promise.all()
              </p>
            </div>
          )}

          {summary && (
            <>
              {/* Verdict */}
              <div className={`rounded-xl p-5 border ${
                passed
                  ? "bg-[var(--success-bg)] border-[var(--success-border)]"
                  : failed
                  ? "bg-[var(--danger-bg)] border-[var(--danger-border)]"
                  : "bg-[var(--warning-bg)] border-[var(--warning-border)]"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{passed ? "✅" : failed ? "❌" : "⚠️"}</span>
                  <div>
                    <p className={`font-bold text-sm ${passed ? "text-[var(--success)]" : failed ? "text-[var(--danger)]" : "text-[var(--warning)]"}`}>
                      {passed
                        ? "PASSED — Concurrency is correctly handled"
                        : failed
                        ? "FAILED — Race condition detected!"
                        : "PARTIAL — Review results below"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Completed in {summary.totalDurationMs}ms
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 text-sm">Results</h3>
                <div className="space-y-4">
                  {[
                    { label: "Total Requests", value: summary.total, color: "text-[var(--text-primary)]", barColor: "bg-[var(--gold)]" },
                    { label: "✅ 201 Created (succeeded)", value: summary.succeeded, color: "text-[var(--success)]", barColor: "bg-[var(--success)]" },
                    { label: "🚫 409 Conflict (expected)", value: summary.failed409, color: "text-[var(--warning)]", barColor: "bg-[var(--warning)]" },
                    { label: "❌ Other Errors", value: summary.otherErrors, color: "text-[var(--danger)]", barColor: "bg-[var(--danger)]" },
                  ].map(({ label, value, color, barColor }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1.5 text-sm">
                        <span className="text-[var(--text-secondary)]">{label}</span>
                        <span className={`font-mono font-bold ${color}`}>{value}</span>
                      </div>
                      <ProgressBar value={value} max={summary.total} color={barColor} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Successful reservation detail */}
              {summary.results.filter((r) => r.status === 201).map((r) => (
                <div key={r.requestId} className="bg-[var(--success-bg)] border border-[var(--success-border)] rounded-xl p-5">
                  <p className="text-xs font-bold text-[var(--success)] uppercase tracking-wider mb-3">
                    ✅ Successful Reservation (Request #{r.requestId})
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Reservation ID</span>
                      <span className="font-mono text-xs text-[var(--text-primary)]">{String(r.body.id).slice(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Status</span>
                      <span className="font-mono text-[var(--success)]">{String(r.body.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Expires at</span>
                      <span className="font-mono text-xs text-[var(--text-primary)]">
                        {r.body.expiresAt ? new Date(String(r.body.expiresAt)).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Response time</span>
                      <span className="font-mono text-[var(--text-primary)]">{r.durationMs}ms</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Request log */}
              <div className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">Request Log</h3>
                  <span className="text-xs text-[var(--text-muted)]">{summary.results.length} requests</span>
                </div>
                <div className="overflow-y-auto max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--surface-2)] sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 text-[var(--text-muted)] font-medium">#</th>
                        <th className="text-left px-4 py-2 text-[var(--text-muted)] font-medium">Status</th>
                        <th className="text-left px-4 py-2 text-[var(--text-muted)] font-medium">Message</th>
                        <th className="text-right px-4 py-2 text-[var(--text-muted)] font-medium">ms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {summary.results.map((r) => (
                        <tr key={r.requestId} className="hover:bg-[var(--surface-2)]">
                          <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{r.requestId}</td>
                          <td className="px-4 py-2">
                            <span className={`font-mono font-bold ${
                              r.status === 201 ? "text-[var(--success)]" :
                              r.status === 409 ? "text-[var(--warning)]" :
                              "text-[var(--danger)]"
                            }`}>
                              {r.status || "ERR"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)] truncate max-w-[180px]">
                            {r.status === 201 ? "Reserved successfully" :
                             r.status === 409 ? String(r.body.error ?? "Insufficient stock") :
                             String(r.body.error ?? "Error")}
                          </td>
                          <td className="px-4 py-2 font-mono text-[var(--text-muted)] text-right">{r.durationMs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: "🔒",
            title: "SELECT FOR UPDATE",
            desc: "The reservation endpoint acquires a row-level lock on the Inventory row before checking stock. Concurrent transactions queue behind the lock — only one proceeds at a time.",
          },
          {
            icon: "🚫",
            title: "HTTP 409 on Contention",
            desc: "After the first transaction commits (incrementing reservedUnits), every subsequent transaction reads the updated value, finds available = 0, and returns 409 — never overselling.",
          },
          {
            icon: "⚡",
            title: "Atomic Check + Write",
            desc: "The check (available ≥ quantity) and the write (reservedUnits += quantity) happen inside a single Prisma transaction. There is no window for a race condition between them.",
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-5">
            <div className="text-2xl mb-3">{icon}</div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2 text-sm">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
