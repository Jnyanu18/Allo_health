# Allo Health — Inventory Reservation System

A production-style stock hold system for Allo Health checkout flows where payment can take minutes and overselling would break patient trust.

## The Problem

If stock is decremented only after payment, two patients can pay for the last physical kit and one must be refunded. If stock is decremented at add-to-cart, abandoned carts hide real inventory and conversion drops.

This app uses a 10-minute reservation window: reserve at checkout, confirm after payment, or release when payment fails, the user cancels, or the timer expires.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | What it is for | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Runtime Postgres connection, usually pooled | Neon or Supabase |
| `DIRECT_URL` | Direct Postgres connection for migrations | Neon or Supabase |
| `REDIS_URL` | Redis lock store using ioredis URL format | Upstash Redis |
| `CRON_SECRET` | Bearer token for expiry cron | Generate a random string |

## How Expiry Works

There are three layers. Vercel Cron runs once per day and releases all expired pending reservations. Every reserve request calls `lazyExpireForProduct(productId, warehouseId)` before checking availability. Confirm also checks `expiresAt` inside the transaction and returns `410` with `expiredAt` if the hold is stale.

The trade-off is that expiry is eventually consistent by up to a minute unless a user touches the affected SKU sooner. The confirm-time check is the final guard.

## How Concurrency Is Handled

`POST /api/reservations` uses Redis `SET NX PX` as an advisory lock on `stock:<productId>:<warehouseId>`. Both the lock acquisition and the lazy-expiry cleanup run in parallel.

Every request then enters a Postgres `READ COMMITTED` transaction with `SELECT … FOR UPDATE` on the stock row. This row-level lock serialises all concurrent writes to the same SKU — the winner increments `stock.reserved` and creates the reservation; any request that arrives and finds `available < quantity` gets `409 Insufficient stock`.

If Redis is unavailable or the lock is already held, the request skips the advisory lock and proceeds directly to the DB path. `SELECT FOR UPDATE` is the correctness guarantee; Redis is a performance optimisation that reduces DB contention under high concurrency.

## Idempotency (Bonus)

Reserve and confirm accept `Idempotency-Key`. The key is namespaced by endpoint, stored in `IdempotencyKey`, and replayed for 24 hours with the original status code and JSON response. Unique constraint races are ignored safely.

## API Reference

| Method | Path | Auth | Status codes | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/products` | None | `200` | Products with per-warehouse stock, no-store |
| `GET` | `/api/warehouses` | None | `200` | Warehouses ordered by name |
| `POST` | `/api/reservations` | Optional idempotency | `201`, `400`, `404`, `409` | Redis advisory lock + `SELECT FOR UPDATE` transaction |
| `GET` | `/api/reservations/:id` | None | `200`, `404` | Includes product price for totals |
| `POST` | `/api/reservations/:id/confirm` | Optional idempotency | `200`, `404`, `410` | Confirms pending holds or releases expired ones |
| `POST` | `/api/reservations/:id/release` | None | `200`, `404`, `409` | Cannot release confirmed reservations |
| `GET` | `/api/cron/expire-reservations` | Bearer cron secret | `200`, `401` | Bulk expiry cleanup |

## Trade-offs & What I'd Add

- Retry logic for `429` with exponential backoff.
- SSE or WebSocket inventory updates instead of 30-second polling.
- Rate limiting by user/IP on the reserve endpoint.
- Multi-item cart reservation with all-or-nothing batch locking.
- Razorpay integration for Indian UPI and card payment flows.
- User sessions tying reservations to authenticated accounts.
- Structured logs, Sentry, and lock contention metrics.
- Benchmark Redis locks against `SELECT FOR UPDATE` for this traffic profile.

## Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | 15.5.7 | App Router, API routes, deployment target |
| React | 19.2 | Client interactivity |
| TypeScript | 5.x strict | Static correctness |
| Prisma | 6.19 | ORM and migrations |
| Postgres | Hosted | Durable stock and reservations |
| ioredis | 5.x | Redis `SET NX PX` locks |
| Zod | 4.x | Shared request validation |
| Tailwind CSS | 4.x | Allo-style UI |
