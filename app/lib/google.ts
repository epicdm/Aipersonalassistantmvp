import { clerkClient } from "@clerk/nextjs/server";

// ═══════════════════════════════════════════════════════════════
// FACEBOOK / INSTAGRAM
// ═══════════════════════════════════════════════════════════════

export async function getFacebookToken(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_facebook");
    return tokens.data?.[0]?.token || null;
  } catch {
    return null;
  }
}

export async function isFacebookUser(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.externalAccounts?.some(a => a.provider === "oauth_facebook") || false;
  } catch {
    return false;
  }
}

// ─── Instagram Types ───────────────────────────────────────────
export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  followersCount: number;
  mediaCount: number;
  profilePicture?: string;
}

export interface InstagramDM {
  id: string;
  from: string;
  message: string;
  timestamp: string;
}

// ─── Get Instagram Business Account via Facebook Page ──────────
export async function getInstagramProfile(userId: string): Promise<InstagramProfile | null> {
  const token = await getFacebookToken(userId);
  if (!token) return null;

  try {
    // Get user's Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token=${token}`
    );
    if (!pagesRes.ok) return null;
    const pagesData = await pagesRes.json();

    // Find first page with Instagram connected
    const pageWithIG = pagesData.data?.find(
      (p: Record<string, unknown>) => p.instagram_business_account
    );
    if (!pageWithIG) return null;

    const igId = (pageWithIG.instagram_business_account as Record<string, string>).id;

    // Get Instagram profile
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=id,username,name,followers_count,media_count,profile_picture_url&access_token=${token}`
    );
    if (!igRes.ok) return null;
    const ig = await igRes.json();

    return {
      id: ig.id,
      username: ig.username,
      name: ig.name || ig.username,
      followersCount: ig.followers_count || 0,
      mediaCount: ig.media_count || 0,
      profilePicture: ig.profile_picture_url,
    };
  } catch (e) {
    console.error("[Instagram] Error:", e);
    return null;
  }
}

// ─── Get recent Instagram DMs ──────────────────────────────────
export async function getInstagramDMs(userId: string, limit = 5): Promise<InstagramDM[]> {
  const token = await getFacebookToken(userId);
  if (!token) return [];

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,instagram_business_account&access_token=${token}`
    );
    if (!pagesRes.ok) return [];
    const pagesData = await pagesRes.json();

    const pageWithIG = pagesData.data?.find(
      (p: Record<string, unknown>) => p.instagram_business_account
    );
    if (!pageWithIG) return [];

    const igId = (pageWithIG.instagram_business_account as Record<string, string>).id;

    // Get conversations
    const convoRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/conversations?fields=participants,messages{message,from,created_time}&limit=${limit}&access_token=${token}`
    );
    if (!convoRes.ok) return [];
    const convoData = await convoRes.json();

    const dms: InstagramDM[] = [];
    for (const convo of convoData.data || []) {
      for (const msg of convo.messages?.data || []) {
        dms.push({
          id: msg.id,
          from: msg.from?.username || msg.from?.name || "Unknown",
          message: msg.message || "",
          timestamp: msg.created_time,
        });
      }
    }
    return dms.slice(0, limit);
  } catch (e) {
    console.error("[Instagram DMs] Error:", e);
    return [];
  }
}

// ─── Format Instagram context for agent ────────────────────────
export function formatInstagramForAgent(
  profile: InstagramProfile | null,
  dms: InstagramDM[]
): string {
  if (!profile) return "";

  let ctx = `📸 Instagram connected: @${profile.username} (${profile.followersCount} followers, ${profile.mediaCount} posts)`;

  if (dms.length > 0) {
    ctx += `\n\nRecent Instagram DMs:`;
    for (const dm of dms) {
      ctx += `\n- From @${dm.from}: "${dm.message.slice(0, 100)}"`;
    }
    ctx += `\n\nYou can reference these DMs and offer to reply.`;
  }

  return ctx;
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE
// ═══════════════════════════════════════════════════════════════

// ─── Get Google OAuth token from Clerk ─────────────────────────
export async function getGoogleToken(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_google");
    const token = tokens.data?.[0]?.token;
    return token || null;
  } catch {
    return null;
  }
}

// ─── Check if user signed in with Google ───────────────────────
export async function isGoogleUser(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.externalAccounts?.some(a => a.provider === "oauth_google") || false;
  } catch {
    return false;
  }
}

// ─── Google Calendar Types ─────────────────────────────────────
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  allDay: boolean;
}

// ─── Fetch upcoming calendar events ────────────────────────────
export async function getUpcomingEvents(
  userId: string,
  maxResults = 10,
  daysAhead = 7
): Promise<CalendarEvent[]> {
  const token = await getGoogleToken(userId);
  if (!token) return [];

  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    console.error("[Google Calendar] Error:", await res.text());
    return [];
  }

  const data = await res.json();
  return (data.items || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    summary: (e.summary as string) || "No title",
    description: e.description as string | undefined,
    start: ((e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date) as string,
    end: ((e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date) as string,
    location: e.location as string | undefined,
    allDay: !!(e.start as Record<string, string>)?.date,
  }));
}

// ─── Get today's events ────────────────────────────────────────
export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const token = await getGoogleToken(userId);
  if (!token) return [];

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    summary: (e.summary as string) || "No title",
    description: e.description as string | undefined,
    start: ((e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date) as string,
    end: ((e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date) as string,
    location: e.location as string | undefined,
    allDay: !!(e.start as Record<string, string>)?.date,
  }));
}

// ─── Create a calendar event ───────────────────────────────────
export async function createCalendarEvent(
  userId: string,
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string
): Promise<CalendarEvent | null> {
  const token = await getGoogleToken(userId);
  if (!token) return null;

  const event = {
    summary,
    description,
    location,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
    reminders: { useDefault: true },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    console.error("[Google Calendar] Create error:", await res.text());
    return null;
  }

  const e = await res.json();
  return {
    id: e.id,
    summary: e.summary || "No title",
    description: e.description,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    location: e.location,
    allDay: !!e.start?.date,
  };
}

// ─── Format events for the agent's context ─────────────────────
export function formatEventsForAgent(events: CalendarEvent[]): string {
  if (events.length === 0) return "No upcoming events.";

  return events
    .map((e) => {
      const start = new Date(e.start);
      const time = e.allDay
        ? "All day"
        : start.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
      const date = start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `- ${date} ${time}: ${e.summary}${e.location ? ` (${e.location})` : ""}`;
    })
    .join("\n");
}
