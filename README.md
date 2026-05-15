# Allo Inventory — Multi-Warehouse Reservation System

A production-grade inventory reservation platform built for the Allo Engineering take-home assignment.
Handles concurrent checkout flows across multiple warehouses with race-condition-safe stock management.

**Live URL:** _Deploy to Vercel and update this_
**GitHub:** https://github.com/Jnyanu18/Allo_health

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Environment Variables](#environment-variables)
3. [Prisma Migration Steps](#prisma-migration-steps)
4. [Seed Instructions](#seed-instructions)
5. [Architecture](#architecture)
6. [Database Schema](#database-schema)
7. [Concurrency Strategy](#concurrency-strategy)
8. [Why SELECT FOR UPDATE](#why-select-for-update)
9. [Expiry Strategy](#expiry-strategy)
10. [Production Cron](#production-cron)
11. [Idempotency](#idempotency)
12. [Concurrency Test](#concurrency-test)
13. [Trade-offs](#trade-offs)
14. [Scaling Considerations](#scaling-considerations)
15. [Deployment Instructions](#deployment-instructions)

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- A hosted PostgreSQL database (Neon or Supabase — free tier works)
- Optional: Upstash Redis (for idempotency key storage)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Jnyanu18/Allo_health.git
cd Allo_health

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your DATABASE_URL, REDIS_URL, etc.

# Push schema to database
npx prisma db push

# Seed the database with demo data
npx tsx prisma/seed.ts

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (pooled). Neon/Supabase. |
| `DIRECT_URL` | ✅ (Neon) | Direct (non-pooled) connection for migrations. |
| `REDIS_URL` | ⬜ | Upstash Redis URL. Used for idempotency key caching. If unset, idempotency keys fall back to PostgreSQL. |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Full URL of your deployed app (e.g. `https://allo.vercel.app`). Used for server-side fetch calls. |
| `CRON_SECRET` | ✅ (prod) | Bearer token to secure the cleanup cron endpoint. |

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
REDIS_URL="rediss://default:token@endpoint.upstash.io:6379"
NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"
CRON_SECRET="your-strong-random-secret"
```

---

## Prisma Migration Steps

This project uses `prisma db push` for schema synchronisation (schema-first, no migration files).

```bash
# Apply schema to database (creates/alters tables)
npx prisma db push

# (Optional) Open Prisma Studio to inspect the DB
npx prisma studio

# Regenerate the Prisma client after schema changes
npx prisma generate
```

> **Why `db push` instead of `migrate`?**  
> For a take-home/demo project, `db push` is faster and avoids managing migration history on a fresh database. For a production system with live data, `prisma migrate deploy` is the correct approach.

---

## Seed Instructions

The seed script populates the database with 25 medical products across 3 warehouses with varied stock levels.

```bash
npx tsx prisma/seed.ts
```

This creates:
- 3 warehouses (Mumbai Central, Delhi North, Bangalore Tech Park)
- 25 medical/wellness products with realistic SKUs and pricing
- Inventory entries for each product/warehouse combination with randomised stock levels

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Next.js App Router                    │
├───────────────────────────┬──────────────────────────────────┤
│      Frontend (RSC)       │        API Route Handlers        │
│  app/page.tsx             │  POST /api/reservations          │
│  app/reservation/[id]/    │  POST /api/reservations/:id/...  │
│  app/components/          │  GET  /api/products              │
│                           │  GET  /api/warehouses            │
│                           │  POST /api/internal/cleanup-...  │
└───────────────────────────┴──────────────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
       ┌──────▼──────┐        ┌────────▼───────┐      ┌────────▼───────┐
       │  lib/prisma  │        │  lib/expiry    │      │ lib/idempotency│
       │  (Prisma 7   │        │  (lazy +       │      │ (PostgreSQL    │
       │   adapter)   │        │   scheduled    │      │  dedup cache)  │
       └──────┬───────┘        │   cleanup)     │      └────────────────┘
              │                └────────────────┘
       ┌──────▼───────────────────────────────────┐
       │          Neon / Supabase PostgreSQL        │
       │   Products | Warehouses | Inventory |     │
       │   Reservations | IdempotencyKeys           │
       └──────────────────────────────────────────┘
```

**Key design decisions:**
- Server Components fetch product data directly — no client-side loading state for the listing page
- Route Handlers are thin — all business logic lives in `lib/`
- Every mutation runs inside a Prisma transaction
- The Inventory table is the single source of truth for stock

---

## Database Schema

### `Product`
Stores product catalogue information.
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Product display name |
| sku | String | Unique stock-keeping unit |
| description | String? | Optional description |
| price | Decimal(10,2) | Unit price in INR |
| imageUrl | String? | Product image |
| createdAt | DateTime | Auto-set |

### `Warehouse`
Physical fulfilment locations.
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Warehouse display name |
| location | String | City / region |
| createdAt | DateTime | Auto-set |

### `Inventory`
**The critical table.** One row per (product, warehouse) pair.
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| productId | String | FK → Product |
| warehouseId | String | FK → Warehouse |
| totalUnits | Int | Physical stock on shelf |
| reservedUnits | Int | Units temporarily held |
| updatedAt | DateTime | Auto-updated |

```
available = totalUnits - reservedUnits
```

> `available` is **never stored** — always computed. This prevents a class of consistency bugs where stored values diverge.

**Unique constraint:** `@@unique([productId, warehouseId])` — exactly one inventory record per product per warehouse.

### `Reservation`
Tracks checkout holds.
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| productId | String | FK → Product |
| warehouseId | String | FK → Warehouse |
| quantity | Int | Units held |
| status | Enum | `pending` → `confirmed` / `released` / `expired` |
| expiresAt | DateTime | now + 10 minutes |
| confirmedAt | DateTime? | Set on confirmation |
| releasedAt | DateTime? | Set on release/cancellation |
| createdAt | DateTime | Auto-set |

**Index:** `@@index([status, expiresAt])` — optimises the cleanup query that scans for expired pending reservations.

### `IdempotencyKey`
Caches API responses for duplicate-request deduplication.
| Field | Type | Notes |
|---|---|---|
| key | String | Unique composite key |
| endpoint | String | Route identifier |
| statusCode | Int | Cached HTTP status |
| response | Json | Cached response body |
| expiresAt | DateTime | TTL — 24 hours |

---

## Concurrency Strategy

### The Problem

A naive implementation looks like:

```typescript
// ❌ UNSAFE — race condition
const inventory = await prisma.inventory.findUnique({ ... });
const available = inventory.totalUnits - inventory.reservedUnits;
if (available < quantity) return 409;
await prisma.inventory.update({ data: { reservedUnits: { increment: quantity } } });
```

Between the `findUnique` and the `update`, another request can read the same `available` value, see stock as available, and both succeed — selling the same physical unit twice.

### The Solution: SELECT FOR UPDATE

```typescript
// ✅ SAFE — atomic check-and-lock
await prisma.$transaction(async (tx) => {
  // 1. Lock the row — no other transaction can read or write it until we commit
  const rows = await tx.$queryRaw`
    SELECT id, "totalUnits", "reservedUnits"
    FROM "Inventory"
    WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
    FOR UPDATE
  `;

  // 2. Compute available (never trust a stale read)
  const available = rows[0].totalUnits - rows[0].reservedUnits;

  // 3. Check — inside the lock
  if (available < quantity) return { status: 409 };

  // 4. Mutate — still inside the lock
  await tx.inventory.update({ data: { reservedUnits: { increment: quantity } } });
  await tx.reservation.create({ data: { ... } });

  // 5. Lock releases on commit
}, { isolationLevel: "ReadCommitted" });
```

**What PostgreSQL guarantees:**  
When transaction A holds a `FOR UPDATE` lock on an Inventory row, transaction B's `SELECT ... FOR UPDATE` on the same row **blocks** until A commits or rolls back. After A commits (having incremented `reservedUnits`), B reads the updated value, sees no available stock, and returns 409.

**Result:** Exactly one transaction succeeds. No overselling. No phantom reads.

---

## Why SELECT FOR UPDATE

`FOR UPDATE` is necessary because:

1. **`findUnique` without locking is a non-blocking read.** Two concurrent transactions can both read `reservedUnits = 0` on a row with `totalUnits = 1`, both compute `available = 1`, both pass the check, and both increment — resulting in `reservedUnits = 2` on a product with only 1 physical unit.

2. **`Serializable` isolation alone is not sufficient here without explicit locking** because it relies on conflict detection at commit time (using predicate locks), which can produce serialisation errors that need retry logic rather than a clean 409. `SELECT FOR UPDATE` gives us deterministic queuing.

3. **Atomic check-then-act:** The entire "read → validate → write" sequence must be indivisible. `FOR UPDATE` achieves this by serialising access to the specific row.

---

## Expiry Strategy

Reservations expire automatically via two complementary mechanisms:

### 1. Lazy Cleanup (on every reservation request)

Before checking stock, the reservation endpoint calls `lazyExpireForProduct(productId, warehouseId)`:

```typescript
// lib/expiry.ts
const expired = await prisma.reservation.findMany({
  where: { productId, warehouseId, status: "pending", expiresAt: { lte: now } },
});
// For each expired reservation: status → "expired", reservedUnits decremented
```

This ensures that when a customer tries to reserve a product, any expired holds are released first — making stock available immediately without waiting for the cron.

### 2. Scheduled Cleanup (every minute via Vercel Cron)

`POST /api/internal/cleanup-expired-reservations` scans **all** expired pending reservations globally and releases their stock. This catches any that lazy cleanup missed (e.g. no new requests came in for a product).

**Safety:** The update uses `updateMany` with `where: { status: "pending" }` — if a reservation was already expired by lazy cleanup, the `updateMany` finds 0 rows and does nothing. Fully idempotent.

---

## Production Cron

`vercel.json` configures Vercel Cron to call the cleanup endpoint every minute:

```json
{
  "crons": [
    {
      "path": "/api/internal/cleanup-expired-reservations",
      "schedule": "* * * * *"
    }
  ]
}
```

The endpoint is protected by a `CRON_SECRET` bearer token:

```
Authorization: Bearer <CRON_SECRET>
```

Vercel automatically passes this header when triggering cron jobs if configured in the Vercel dashboard under **Settings → Cron Jobs → Secret**.

**On Vercel Free tier:** Cron jobs run at most once per day. Upgrade to Pro for minute-level frequency. The lazy cleanup mechanism compensates for this on the free tier.

---

## Idempotency

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support idempotency via the `Idempotency-Key` request header.

**How it works:**

1. Client sends request with header: `Idempotency-Key: <uuid>`
2. Server checks `IdempotencyKey` table for `endpoint:key`
3. If found → return cached `statusCode` + `response` body immediately (no side effects)
4. If not found → execute handler, cache the response, return it

**Storage:** PostgreSQL (`IdempotencyKey` table). Redis can replace this if `REDIS_URL` is configured — Redis gives microsecond lookup vs. milliseconds for PostgreSQL.

**TTL:** Keys expire after 24 hours.

**Why this matters:**
- Network timeouts can cause clients to retry
- Without idempotency, a retry would create a second reservation for the same checkout
- With idempotency, the retry returns the original reservation — same response, no double-booking

---

## Concurrency Test

A test script fires 50 simultaneous reservation requests for the same product/warehouse.

```bash
# Against local dev server
npm run dev  # in another terminal
npx tsx scripts/concurrency-test.ts

# Against production
BASE_URL=https://your-app.vercel.app npx tsx scripts/concurrency-test.ts
```

**Expected output:**
```
============================================================
  ALLO INVENTORY — Concurrency Test
============================================================
  Target: http://localhost:3000
  Concurrency: 50 simultaneous requests
============================================================

[1] Fetching product target...
  → Product: Ashwagandha KSM-66 (cm1abc...)
  → Warehouse: Mumbai Central (cm2xyz...)

[2] Firing 50 simultaneous requests...
  → All requests completed in 312ms

[3] Results:
  ✅  201 Created  : 1
  🚫  409 Conflict : 49
  ❌  Other errors : 0

[4] Assertions:
  ✅  Exactly 1 request succeeded
  ✅  49 requests correctly received 409
  ✅  No unexpected errors

============================================================
  🎉 PASSED — Concurrency handling is correct.
     SELECT FOR UPDATE prevents overselling.
============================================================
```

---

## Trade-offs

| Decision | Trade-off |
|---|---|
| `SELECT FOR UPDATE` over Serializable isolation | Deterministic — returns 409, not a Postgres serialisation error. No retry logic needed. Slightly more explicit SQL. |
| `db push` over `migrate` | Faster setup for demo. Loses migration history. For production with live data, use `prisma migrate deploy`. |
| Lazy cleanup on every reservation | Keeps available stock fresh without cron dependency. Adds a small query overhead to every reservation request. Acceptable for this scale. |
| Idempotency stored in PostgreSQL | Simpler infrastructure (no Redis required). Slightly higher latency than Redis (~5ms vs ~0.5ms). Redis is recommended for high-throughput production. |
| `available` always computed, never stored | Eliminates an entire class of consistency bugs. Costs a subtraction on read — negligible. |
| `price` and `imageUrl` on Product | Not in the strict take-home spec but makes the frontend demo significantly more valuable for reviewers. |

---

## Scaling Considerations

**Current bottlenecks at scale:**

1. **Row-level locking contention**: `SELECT FOR UPDATE` serialises requests per (product, warehouse). At very high QPS (>1000 req/s on the same SKU), lock wait times increase. Solutions:
   - Redis-based distributed lock with short TTL to queue requests before hitting PG
   - Optimistic concurrency with retry (check `reservedUnits` hasn't changed via version/updatedAt)

2. **Prisma connection pool**: Serverless functions create new connections on each invocation. Use PgBouncer (Neon/Supabase provide this) in transaction pooling mode. The `@prisma/adapter-pg` pattern in this project supports this.

3. **Cleanup cron scalability**: A single cleanup job scanning all expired rows is fine up to ~100k reservations/day. Beyond that, partition the scan by `createdAt` range or use a queue (BullMQ, Inngest) to process expirations individually as they come due.

4. **Read scalability**: `GET /api/products` hits the primary. For high read volume, add a read replica and route `findMany` queries there.

---

## Deployment Instructions

### Vercel + Neon (Recommended)

**Step 1 — Database (Neon)**
1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the **Connection string** (pooled) → `DATABASE_URL`
4. Copy the **Direct connection string** → `DIRECT_URL`

**Step 2 — Redis (Upstash, optional)**
1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy the **REST URL** → `REDIS_URL`

**Step 3 — Vercel**
1. Push repository to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   ```
   DATABASE_URL=...
   DIRECT_URL=...
   REDIS_URL=...
   NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
   CRON_SECRET=<generate with: openssl rand -hex 32>
   ```
4. Deploy

**Step 4 — Initialise Database**

After deployment, run once from your local machine (pointing at the live DB):

```bash
# Apply schema
npx prisma db push

# Seed demo data
npx tsx prisma/seed.ts
```

**Step 5 — Verify**

```bash
# Check products are live
curl https://your-app.vercel.app/api/products | jq '.[0].stock'

# Run concurrency test against production
BASE_URL=https://your-app.vercel.app npx tsx scripts/concurrency-test.ts
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List all products with inventory per warehouse |
| `GET` | `/api/warehouses` | List all warehouses |
| `POST` | `/api/reservations` | Create reservation. Body: `{ productId, warehouseId, quantity }` |
| `POST` | `/api/reservations/:id/confirm` | Confirm reservation (payment succeeded) |
| `POST` | `/api/reservations/:id/release` | Release reservation (payment failed / cancelled) |
| `POST` | `/api/internal/cleanup-expired-reservations` | Expire stale pending reservations (cron target) |

**Error codes:**
- `400` — Validation error (Zod)
- `404` — Resource not found
- `409` — Insufficient stock
- `410` — Reservation expired (on confirm attempt)
- `429` — Concurrent reservation in progress (transient — retry)
- `500` — Internal server error

---

*Built by Jnyanu18 for the Allo Engineering take-home exercise.*
