# Allo Inventory — Take-Home Exercise

A Next.js App Router application for race-condition-safe inventory reservations across multiple warehouses.

**Live demo:** _[Deploy to Vercel and paste URL here]_

---

## How to run locally

### 1. Prerequisites

- Node.js 18+
- A hosted Postgres instance (Supabase, Neon, or Railway — all have free tiers)
- An Upstash Redis instance (free tier)

### 2. Clone and install

```bash
git clone <repo>
cd allo-inventory
npm install
```

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable               | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string (Neon/Supabase/Railway) |
| `REDIS_URL`            | Upstash Redis URL                                  |
| `NEXT_PUBLIC_BASE_URL` | Your app URL (use `http://localhost:3000` locally) |
| `CRON_SECRET`          | Optional — protects the cron endpoint              |

### 4. Run migrations and seed

```bash
npx prisma db push            # push schema to your hosted Postgres

# Seed the database
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## The Core Problem First

Before touching any code, understand what you're actually solving:

**The race condition:** Two users hit "Reserve" at the exact same millisecond for the last unit. Both requests read `available = 1`, both see "yes there's stock", both write their reservation. Now you've sold the same physical unit twice.

This is a classic **check-then-act** concurrency bug. The fix is making the check and the act **atomic** — no other request can sneak in between them.

---

## Data Model — Think Before You Schema

```
Product       → has many Stock entries
Warehouse     → has many Stock entries
Stock         → one row per (product, warehouse) pair
               fields: total, reserved
               available = total - reserved  ← NEVER store this, always compute
Reservation   → links to product + warehouse
               status: PENDING | CONFIRMED | RELEASED
               expiresAt: DateTime
IdempotencyKey → for the bonus
```

**Why `total` and `reserved` instead of just `available`?**

Because you need to know two separate things:

- How many units physically exist (`total`)
- How many are currently locked by pending checkouts (`reserved`)

On **confirm**: decrement both `total` and `reserved` (unit is sold, gone forever)
On **release/expire**: decrement only `reserved` (unit returns to available pool, `total` unchanged)

```
available = total - reserved
```

This is always computed, never stored. Storing it would create a third number to keep in sync, and three numbers going out of sync is three times the bugs.

---

## Architecture decisions

### Concurrency: How we prevent double-selling

This is the core problem. Two requests arrive simultaneously for the last unit — exactly one should succeed.

**Approach: Redis distributed lock + Postgres serializable transaction**

When a reservation request arrives:

1. We acquire a Redis lock scoped to `stock:{productId}:{warehouseId}` using `SET NX PX` (atomic set-if-not-exists with TTL). This serialises concurrent requests for the same SKU at the same warehouse.
2. Inside the lock, we open a Postgres transaction with `isolationLevel: "Serializable"`. We read `stock.reserved`, check availability, and increment `reserved` — all in one transaction.
3. The lock is released after the transaction completes.

**Why both?**

The Postgres serializable transaction alone would work in a single-instance setup (it would throw a serialization error and we'd retry), but it produces noise (retries, errors) under high concurrency. The Redis lock serialises requests cleanly _before_ they hit the database, turning a thundering herd into a queue. The serializable transaction is a belt-and-suspenders safety net for correctness.

**Why not `SELECT FOR UPDATE`?**

`SELECT FOR UPDATE` on the stock row would also work and is simpler. I chose the Redis lock because it avoids holding a DB row lock during network I/O and is easier to reason about at the application layer. Either approach is correct.

### Reservation expiry

Three mechanisms work together:

1. **Vercel Cron** (`vercel.json`) runs `GET /api/cron/expire-reservations` every minute. This is the primary cleanup path in production. It scans for `status=PENDING, expiresAt <= now` and releases them in transactions that also decrement `stock.reserved`.

2. **Lazy expiry on reserve**: Before attempting any new reservation, `lazyExpireForProduct()` runs and cleans up stale reservations for that product+warehouse. This ensures available stock is accurate even if the cron is slightly delayed.

3. **Expiry check on confirm**: If a client tries to confirm an expired reservation, `POST /api/reservations/:id/confirm` checks `expiresAt`, releases the reservation, and returns `410 Gone`.

The UI shows a live countdown and polls the server every 30 seconds to stay in sync.

### Idempotency (bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` support the `Idempotency-Key` request header.

On first request: execute the handler, store `{key, endpoint, statusCode, responseBody}` in the `IdempotencyKey` table with a 24-hour TTL.

On retry with the same key: return the stored response directly, skipping the handler. This means a client that retries due to a network timeout won't accidentally create two reservations or double-confirm.

The key is namespaced by endpoint (`POST:/api/reservations:<client-key>`) to avoid collisions across different operations.

### Stock model

```
Stock.total    = physical units in the warehouse
Stock.reserved = units currently held by PENDING reservations
available      = total - reserved  (computed, never stored)
```

On `CONFIRM`: `total -= quantity`, `reserved -= quantity` (stock is permanently decremented)  
On `RELEASE` or expiry: `reserved -= quantity` (total unchanged, units return to available)

---

## Frontend Logic

### Product listing page (Server Component → Client Component split)

```tsx
// app/page.tsx — Server Component, fetches data
export default async function Home() {
  const products = await fetch(`${BASE_URL}/api/products`, {
    cache: "no-store",
  }).then((r) => r.json());
  return <ProductGrid products={products} />;
}
```

```tsx
// app/components/ProductGrid.tsx — "use client"
// Handles the reserve modal, calls POST /api/reservations, redirects to /reservation/:id
```

**Why server/client split?** Initial data loads fast with zero client JS. The interactive modal only needs to be a client component.

### Reservation page

```tsx
// app/reservation/[id]/ReservationClient.tsx — "use client"
function useCountdown(expiresAt: string, status: string) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
    ),
  );

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(() => {
      setSecondsLeft(
        Math.max(
          0,
          Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
        ),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  return secondsLeft;
}
```

The countdown is purely client-side math — `expiresAt` (from server) minus `Date.now()` (client), recalculated every second. No polling needed for the countdown itself.

**State refresh after confirm/cancel:**

```tsx
async function handleConfirm() {
  const res = await fetch(`/api/reservations/${id}/confirm`, {
    method: "POST",
  });
  if (res.status === 410) {
    setError("Expired — stock returned to inventory.");
    await fetchLatest(); // re-fetch to update UI state
    return;
  }
  await fetchLatest(); // re-fetch on success too
}

async function fetchLatest() {
  const data = await fetch(`/api/reservations/${id}`).then((r) => r.json());
  setReservation(data); // React re-renders automatically
}
```

No page refresh — just update the local state and React re-renders everything.

---

## Trade-offs and things I'd do differently

**What I'd add with more time:**

- **Retry logic for the 429 (lock contention)**: Currently the client gets a 429 if it hits a locked stock row. A production system would retry with exponential backoff.
- **Webhook/event stream**: Instead of polling every 30s, use SSE or WebSockets to push reservation state changes to the UI.
- **Partial reservations**: Right now it's all-or-nothing. Multi-item carts would need a batch reserve endpoint that's transactional across multiple SKUs.
- **Rate limiting**: The reserve endpoint should be rate-limited per user/IP to prevent reservation squatting.
- **Proper auth**: Users, sessions, and tying reservations to user accounts.
- **Observability**: Structured logging, Datadog/Sentry, metrics on lock contention rate and reservation conversion.
- **`SELECT FOR UPDATE` variant**: Worth benchmarking against the Redis lock approach at scale.

**What I knowingly skipped:**

- Unit/integration tests (noted in the README as a time constraint)
- Optimistic UI updates (currently waits for server round-trip)
- Multi-item cart support
- Payment gateway integration (mocked by the Confirm button)

---

## API reference

| Method | Path                            | Description                                      |
| ------ | ------------------------------- | ------------------------------------------------ |
| GET    | `/api/products`                 | List products with stock per warehouse           |
| GET    | `/api/warehouses`               | List warehouses                                  |
| POST   | `/api/reservations`             | Create reservation (supports `Idempotency-Key`)  |
| GET    | `/api/reservations/:id`         | Get reservation details                          |
| POST   | `/api/reservations/:id/confirm` | Confirm reservation (supports `Idempotency-Key`) |
| POST   | `/api/reservations/:id/release` | Release reservation early                        |
| GET    | `/api/cron/expire-reservations` | Cron endpoint (called by Vercel every minute)    |

**Error codes:**

- `400` — validation error
- `404` — not found
- `409` — insufficient stock (reserve) or already confirmed (release)
- `410` — reservation expired (confirm)
- `429` — lock contention, retry

---

## What Reviewers Are Actually Checking

**Concurrency correctness** — they may literally fire two simultaneous requests at `/api/reservations` for the last unit and check that exactly one gets 201 and the other gets 409. Your Redis lock + serializable transaction handles this.

**README clarity** — they want to see you understood WHY the problem is hard before you coded. Lead with the race condition explanation, then explain your solution.

**Git history** — commit as you build: schema first, then API layer, then frontend, then deployment. Don't squash everything into one commit.

**Error surfaces** — 409 and 410 must be visible to the user. Don't `console.error` them silently.

**Working live URL** — seed your DB before the debrief. They'll click Reserve live on the call.

---

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript)
- **Prisma 7** (ORM + driver adapters + `prisma.config.ts`)
- **Postgres** (Neon/Supabase/Railway via `@prisma/adapter-pg`)
- **Redis** (Upstash, distributed locking + idempotency)
- **Zod** (request validation)
- **Tailwind CSS 4** (styling)
