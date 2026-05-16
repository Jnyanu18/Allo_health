import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export async function withIdempotency(
  key: string | null,
  endpoint: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!key) return handler();

  const compositeKey = `${endpoint}:${key}`;
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: compositeKey },
  });

  if (existing) {
    return NextResponse.json(existing.response, { status: existing.statusCode });
  }

  const response = await handler();

  // Don't cache transient errors — the client should retry and get a fresh attempt.
  if (response.status === 429 || response.status >= 500) {
    return response;
  }

  const body = await response.clone().json();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Fire-and-forget: don't block the response on the DB write.
  // A duplicate-key error (P2002) means a concurrent request already stored it — safe to ignore.
  prisma.idempotencyKey
    .create({
      data: { key: compositeKey, endpoint, statusCode: response.status, response: body, expiresAt },
    })
    .catch((error: unknown) => {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      ) {
        console.error("idempotency store failed:", error);
      }
    });

  return response;
}
