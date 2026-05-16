import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [released, { count: prunedKeys }] = await Promise.all([
    releaseExpiredReservations(),
    prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
  ]);

  return NextResponse.json({
    ok: true,
    released,
    prunedKeys,
    timestamp: new Date().toISOString(),
  });
}
