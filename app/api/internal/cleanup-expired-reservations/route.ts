import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

// POST /api/internal/cleanup-expired-reservations
// Called by Vercel Cron (see vercel.json) or manually.
// Safe to call multiple times — idempotent by design.
export async function POST(request: NextRequest) {
  // Protect with a shared secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await releaseExpiredReservations();
    console.log(`[cleanup] Expired ${expired} reservation(s)`);
    return NextResponse.json({
      ok: true,
      expired,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cleanup] Failed:", error);
    return NextResponse.json(
      { error: "Cleanup job failed" },
      { status: 500 },
    );
  }
}
