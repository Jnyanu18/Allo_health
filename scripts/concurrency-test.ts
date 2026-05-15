#!/usr/bin/env tsx
/**
 * Concurrency Test — Reservation Race Condition
 * ==============================================
 * Fires 50 simultaneous POST /api/reservations requests for the SAME
 * product/warehouse that has only 1 unit available.
 *
 * Expected result:
 *   - Exactly 1 request succeeds (HTTP 201)
 *   - All others fail with HTTP 409 (Insufficient stock)
 *
 * Run:
 *   npx tsx scripts/concurrency-test.ts
 *   or
 *   BASE_URL=https://your-app.vercel.app npx tsx scripts/concurrency-test.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = 50;

interface TestResult {
  requestId: number;
  status: number;
  body: unknown;
  durationMs: number;
}

async function fireReservation(
  productId: string,
  warehouseId: string,
  requestId: number,
): Promise<TestResult> {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Unique key per request — ensures no idempotency dedupe
      "Idempotency-Key": `test-${productId}-${warehouseId}-req${requestId}-${Date.now()}`,
    },
    body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
  });

  const body = await res.json();
  return {
    requestId,
    status: res.status,
    body,
    durationMs: Date.now() - start,
  };
}

async function getTestTarget(): Promise<{
  productId: string;
  warehouseId: string;
  productName: string;
  warehouseName: string;
}> {
  const res = await fetch(`${BASE_URL}/api/products`);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  const products = await res.json();

  // Find any product+warehouse with exactly 1 unit available (or set one up)
  for (const product of products) {
    for (const stock of product.stock) {
      if (stock.available >= 1) {
        return {
          productId: product.id,
          warehouseId: stock.warehouseId,
          productName: product.name,
          warehouseName: stock.warehouseName,
        };
      }
    }
  }

  throw new Error(
    "No product with available stock found. Run the seed first:\n  npx tsx prisma/seed.ts",
  );
}

async function run() {
  console.log("=".repeat(60));
  console.log("  ALLO INVENTORY — Concurrency Test");
  console.log("=".repeat(60));
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Concurrency: ${CONCURRENCY} simultaneous requests`);
  console.log("=".repeat(60));

  // Step 1: Get a real product and warehouse from the DB
  console.log("\n[1] Fetching product target...");
  const target = await getTestTarget();
  console.log(
    `  → Product: ${target.productName} (${target.productId.slice(0, 8)}...)`,
  );
  console.log(
    `  → Warehouse: ${target.warehouseName} (${target.warehouseId.slice(0, 8)}...)`,
  );

  // Step 2: Fire all requests simultaneously
  console.log(`\n[2] Firing ${CONCURRENCY} simultaneous requests...`);
  const start = Date.now();
  const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
    fireReservation(target.productId, target.warehouseId, i + 1),
  );
  const results = await Promise.all(requests);
  const totalMs = Date.now() - start;
  console.log(`  → All requests completed in ${totalMs}ms`);

  // Step 3: Analyse results
  const successes = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);
  const errors = results.filter(
    (r) => r.status !== 201 && r.status !== 409,
  );

  console.log("\n[3] Results:");
  console.log(`  ✅  201 Created  : ${successes.length}`);
  console.log(`  🚫  409 Conflict : ${conflicts.length}`);
  console.log(`  ❌  Other errors : ${errors.length}`);

  if (successes.length > 0) {
    const s = successes[0].body as Record<string, unknown>;
    console.log(`\n  Successful reservation:`);
    console.log(`    ID      : ${s.id}`);
    console.log(`    Status  : ${s.status}`);
    console.log(`    Expires : ${s.expiresAt}`);
    console.log(`    Latency : ${successes[0].durationMs}ms`);
  }

  if (errors.length > 0) {
    console.log("\n  Unexpected errors:");
    errors.forEach((e) =>
      console.log(`    req ${e.requestId}: HTTP ${e.status} — ${JSON.stringify(e.body)}`),
    );
  }

  // Step 4: Assertions
  console.log("\n[4] Assertions:");
  let passed = true;

  if (successes.length === 1) {
    console.log("  ✅  Exactly 1 request succeeded");
  } else {
    console.log(
      `  ❌  Expected 1 success, got ${successes.length} — RACE CONDITION DETECTED`,
    );
    passed = false;
  }

  if (conflicts.length === CONCURRENCY - 1) {
    console.log(`  ✅  ${conflicts.length} requests correctly received 409`);
  } else {
    console.log(
      `  ❌  Expected ${CONCURRENCY - 1} conflicts, got ${conflicts.length}`,
    );
    passed = false;
  }

  if (errors.length === 0) {
    console.log("  ✅  No unexpected errors");
  } else {
    console.log(`  ❌  ${errors.length} unexpected error(s)`);
    passed = false;
  }

  console.log("\n" + "=".repeat(60));
  if (passed) {
    console.log("  🎉 PASSED — Concurrency handling is correct.");
    console.log("     SELECT FOR UPDATE prevents overselling.");
  } else {
    console.log("  ❌ FAILED — Review the reservation logic.");
  }
  console.log("=".repeat(60) + "\n");

  process.exit(passed ? 0 : 1);
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
