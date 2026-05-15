import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await releaseExpiredReservations();
    console.log(`Cron: Released ${released} expired reservations`);
    return NextResponse.json({
      ok: true,
      released,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
