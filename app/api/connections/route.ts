import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { isGoogleUser, getGoogleToken, isFacebookUser, getFacebookToken, getInstagramProfile } from "@/app/lib/google";

export const dynamic = "force-dynamic";

// GET /api/connections — check what services are connected
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const google = await isGoogleUser(user.clerkId);
  const googleToken = google ? await getGoogleToken(user.clerkId) : null;

  const facebook = await isFacebookUser(user.clerkId);
  const fbToken = facebook ? await getFacebookToken(user.clerkId) : null;
  let instagram = null;
  if (fbToken) {
    const igProfile = await getInstagramProfile(user.clerkId);
    if (igProfile) {
      instagram = {
        connected: true,
        username: igProfile.username,
        followers: igProfile.followersCount,
        posts: igProfile.mediaCount,
      };
    }
  }

  // Determine provider
  const provider = google ? "google" : facebook ? "facebook" : "other";

  return NextResponse.json({
    google: {
      signedIn: google,
      calendar: !!googleToken,
      email: false, // future
      contacts: false, // future
    },
    facebook: {
      signedIn: facebook,
      pages: !!fbToken,
      instagram: !!instagram,
      instagramProfile: instagram,
    },
    provider,
  });
}
