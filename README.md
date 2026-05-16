# Allo Health — Inventory Reservation System

A production-style stock hold system for Allo Health checkout flows. When a customer proceeds to checkout, we hold the units for 10 minutes. If payment succeeds the reservation is confirmed and stock is permanently decremented. If payment fails or the timer runs out the hold is released and units return to available inventory.

## The Problem

If stock is decremented only after payment, two patients can pay for the last physical kit — one gets a refund, the other a bad experience. If stock is decremented at add-to-cart, abandoned carts hide real inventory and conversion drops.

The solution is a reservation: hold at checkout, confirm after payment, release on failure or timeout.

---

## Local Setup

```bash
npm install
cp .env.example .env.local   # fill in values from the table below
npm run db:push              # push schema to Postgres
npm run db:seed              # seed 6 products + 3 warehouses
npm run dev                  # start at http://localhost:3000
```

## Environment Variables

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Pooled Postgres connection (add `&pgbouncer=true`) | Neon / Supabase |
| `DIRECT_URL` | Direct Postgres connection for migrations | Neon / Supabase |
| `REDIS_URL` | Redis in ioredis URL format (`rediss://...`) | Upstash Redis |
| `CRON_SECRET` | Bearer token that guards the expiry cron endpoint | Any random string |

---

## How Expiry Works

Three layers work together:

1. **Vercel Cron** — runs once per day (`0 0 * * *`), sweeps all `PENDING` reservations where `expiresAt ≤ now` and releases them in individual serialisable transactions.
2. **Lazy expiry on reserve** — every `POST /api/reservations` call runs `lazyExpireForProduct(productId, warehouseId)` in parallel with the Redis lock acquisition, freeing expired holds for the same SKU before availability is checked.
3. **Confirm-time guard** — `POST /api/reservations/:id/confirm` checks `expiresAt` atomically inside the transaction. If the hold has lapsed it auto-releases and returns `410` with the exact `expiredAt` timestamp.

The practical result: stock is freed within the same request cycle for any SKU that gets touched, even if the cron hasn't run yet.

---

## How Concurrency Is Handled

`POST /api/reservations` uses two layers:

**Layer 1 — Redis advisory lock** (`SET NX PX 2000`): acquired on `stock:<productId>:<warehouseId>` with a 2-second TTL. Lock acquisition and lazy expiry run in parallel via `Promise.allSettled`. If Redis is unavailable or the lock is already held, the request skips the lock and proceeds directly to the DB — no 429 is ever shown to the user.

**Layer 2 — `SELECT … FOR UPDATE`**: inside a `READ COMMITTED` Postgres transaction, the stock row is locked at the row level. The winner recomputes `available = total − reserved`, increments `stock.reserved`, and creates the reservation. Any request that finds `available < quantity` gets `409 Insufficient stock`.

`SELECT FOR UPDATE` is the **correctness guarantee**. Redis is a **performance optimisation** that reduces DB contention under high concurrency. The system is race-condition-free with or without Redis.

---

## Idempotency (Bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` both accept an `Idempotency-Key` header.

- The composite key `endpoint:Idempotency-Key` is stored in the `IdempotencyKey` table with a 24-hour TTL.
- Replaying the same key returns the original HTTP status code and JSON body.
- Transient responses (5xx, 429) are never cached so retries always get a fresh attempt.
- The store write is fire-and-forget — it does not block the response.
- Unique constraint races (two concurrent requests with the same key) are handled gracefully via `P2002` catch.

---

## API Reference

| Method | Path | Auth | Status codes | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/products` | — | `200` | Products with per-warehouse available stock |
| `GET` | `/api/warehouses` | — | `200` | Warehouses ordered by name |
| `POST` | `/api/reservations` | Optional `Idempotency-Key` | `201`, `400`, `404`, `409`, `503` | Redis advisory lock + `SELECT FOR UPDATE` |
| `GET` | `/api/reservations/:id` | — | `200`, `404`, `503` | Full reservation with product and warehouse details |
| `POST` | `/api/reservations/:id/confirm` | Optional `Idempotency-Key` | `200`, `404`, `410`, `503` | Atomic `updateMany` confirm; auto-releases if expired |
| `POST` | `/api/reservations/:id/release` | — | `200`, `404`, `409`, `503` | Cannot release a confirmed reservation |
| `GET` | `/api/cron/expire-reservations` | `Bearer <CRON_SECRET>` | `200`, `401` | Bulk expiry sweep; also prunes stale idempotency keys |

---

## Data Model

```
Product      — id, name, sku, price, category, imageUrl
Warehouse    — id, name, city, state
Stock        — productId × warehouseId → total, reserved   (unique pair)
Reservation  — productId, warehouseId, quantity, status (PENDING/CONFIRMED/RELEASED), expiresAt
IdempotencyKey — composite key, endpoint, statusCode, response JSON, expiresAt
```

`available = total − reserved` is computed at query time, never stored, to avoid a third counter going out of sync.

---

## Performance

| Optimisation | Effect |
| --- | --- |
| `lazyExpireForProduct` + `acquireLock` run via `Promise.allSettled` | Two sequential round-trips become one parallel round-trip |
| Redis `commandTimeout: 500 ms`, `maxRetriesPerRequest: 0` | Redis cold-starts fail in ≤500 ms instead of blocking for 4–6 s |
| `idempotencyKey.create` is fire-and-forget | Response returns the moment the reservation is created |
| `READ COMMITTED` + atomic `updateMany` on confirm/release | Lower transaction overhead vs. Serializable; no lock-conflict retries |
| `SELECT FOR UPDATE` (no Serializable) on reserve | Row-level locking without full table conflict detection |

Warm latency on Vercel + Neon (same region): **~100–200 ms**. Locally from India to a US Neon instance: ~300–800 ms warm, ~5–9 s on Neon cold start.

---

## Trade-offs & What I'd Add

- **SSE / WebSocket** for real-time inventory updates instead of 30-second client polling.
- **User sessions** tying reservations to authenticated accounts so holds survive page refresh.
- **Multi-item cart** reservation with all-or-nothing batch locking across SKUs.
- **Razorpay integration** for Indian UPI, 3DS, and wallet payment flows.
- **Rate limiting** by IP on the reserve endpoint to prevent hold farming.
- **Structured logs + Sentry** with lock contention and expiry metrics.
- **Exponential backoff** retry on the client when a 503 is returned.

---

## Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | 15.5.7 | App Router, API routes, Vercel deployment |
| React | 19.2 | Client interactivity and live countdown |
| TypeScript | 5.x strict | End-to-end type safety |
| Prisma | 6.x | ORM, migrations, interactive transactions |
| Postgres (Neon) | Hosted | Durable stock, reservations, idempotency keys |
| ioredis | 5.x | Redis `SET NX PX` advisory locks |
| Zod | 4.x | Shared request validation between API and forms |
