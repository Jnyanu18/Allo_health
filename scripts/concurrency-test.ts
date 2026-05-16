#!/usr/bin/env tsx

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = Number(process.env.CONCURRENCY || 50);

type ProductResponse = {
  id: string;
  name: string;
  stock: Array<{
    warehouseId: string;
    warehouseName: string;
    available: number;
  }>;
};

type TestResult = {
  requestId: number;
  status: number;
  body: unknown;
  durationMs: number;
};

async function getTarget() {
  const response = await fetch(`${BASE_URL}/api/products`);
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }

  const products = (await response.json()) as ProductResponse[];
  for (const product of products) {
    for (const warehouse of product.stock) {
      if (warehouse.available >= 1) {
        return {
          productId: product.id,
          productName: product.name,
          warehouseId: warehouse.warehouseId,
          warehouseName: warehouse.warehouseName,
        };
      }
    }
  }

  throw new Error("No inventory with available stock found.");
}

async function reserve(
  target: Awaited<ReturnType<typeof getTarget>>,
  requestId: number,
): Promise<TestResult> {
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      productId: target.productId,
      warehouseId: target.warehouseId,
      quantity: 1,
    }),
  });

  return {
    requestId,
    status: response.status,
    body: await response.json().catch(() => null),
    durationMs: Date.now() - startedAt,
  };
}

async function run() {
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);

  const target = await getTarget();
  console.log(`Product: ${target.productName}`);
  console.log(`Warehouse: ${target.warehouseName}`);

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, index) =>
      reserve(target, index + 1),
    ),
  );

  const succeeded = results.filter((result) => result.status === 201);
  const conflicted = results.filter((result) => result.status === 409);
  const contended = results.filter((result) => result.status === 429);
  const other = results.filter(
    (result) =>
      result.status !== 201 && result.status !== 409 && result.status !== 429,
  );

  console.log(`201 Created: ${succeeded.length}`);
  console.log(`409 Conflict: ${conflicted.length}`);
  console.log(`429 Lock contention: ${contended.length}`);
  console.log(`Other errors: ${other.length}`);

  if (other.length > 0) {
    for (const result of other) {
      console.log(
        `Unexpected #${result.requestId}: ${result.status} ${JSON.stringify(result.body)}`,
      );
    }
  }

  const passed =
    succeeded.length === 1 &&
    conflicted.length + contended.length === CONCURRENCY - 1 &&
    other.length === 0;

  console.log(passed ? "PASS" : "FAIL");
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
