import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { isGoogleUser, getGoogleToken } from "@/app/lib/google";

export const dynamic = "force-dynamic";

// GET /api/connections — check what services are connected
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const google = await isGoogleUser(user.clerkId);
  const googleToken = google ? await getGoogleToken(user.clerkId) : null;

  return NextResponse.json({
    google: {
      signedIn: google,
      calendar: !!googleToken,
      email: false, // future
      contacts: false, // future
    },
    facebook: {
      signedIn: false, // TODO: detect facebook login
      pages: false,
      instagram: false,
    },
    provider: google ? "google" : "other",
  });
}
