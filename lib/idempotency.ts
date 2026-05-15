import { prisma } from "./prisma";
import { NextResponse } from "next/server";

const IDEMPOTENCY_KEY_TTL_HOURS = 24;

export async function withIdempotency(
  key: string | null,
  endpoint: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!key) {
    return handler();
  }

  // Check for existing response
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: `${endpoint}:${key}` },
  });

  if (existing) {
    // Return cached response
    return NextResponse.json(existing.response, {
      status: existing.statusCode,
    });
  }

  // Execute handler
  const response = await handler();

  // Cache the response
  const body = await response
    .clone()
    .json()
    .catch(() => ({}));
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_KEY_TTL_HOURS);

  try {
    await prisma.idempotencyKey.create({
      data: {
        key: `${endpoint}:${key}`,
        endpoint,
        statusCode: response.status,
        response: body,
        expiresAt,
      },
    });
  } catch {
    // If another request already stored it (race), just continue
  }

  return response;
}
