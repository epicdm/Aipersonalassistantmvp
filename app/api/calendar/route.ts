import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { getUpcomingEvents, getTodayEvents, createCalendarEvent, getGoogleToken } from "@/app/lib/google";

export const dynamic = "force-dynamic";

// GET /api/calendar — fetch events
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const range = req.nextUrl.searchParams.get("range") || "week";

  // Check if user has Google connected
  const token = await getGoogleToken(user.clerkId);
  if (!token) {
    return NextResponse.json({
      connected: false,
      events: [],
      message: "Google Calendar not connected. Sign in with Google to enable.",
    });
  }

  const events =
    range === "today"
      ? await getTodayEvents(user.clerkId)
      : await getUpcomingEvents(user.clerkId, 20, range === "month" ? 30 : 7);

  return NextResponse.json({ connected: true, events });
}

// POST /api/calendar — create event
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { summary, startTime, endTime, description, location } = body;

  if (!summary || !startTime || !endTime) {
    return NextResponse.json(
      { error: "summary, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  const event = await createCalendarEvent(
    user.clerkId,
    summary,
    startTime,
    endTime,
    description,
    location
  );

  if (!event) {
    return NextResponse.json(
      { error: "Failed to create event. Is Google Calendar connected?" },
      { status: 500 }
    );
  }

  return NextResponse.json({ event });
}
