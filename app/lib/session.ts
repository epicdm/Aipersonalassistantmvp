import { currentUser, auth } from "@clerk/nextjs/server";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  plan?: string;
};

/**
 * Get the current authenticated user from Clerk.
 * Auto-provisions a DB user on first login.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const user = await currentUser();
    if (!user) return null;

    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const name = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : email.split("@")[0];

    // Auto-provision user in our DB if they don't exist
    const { prisma } = await import("@/app/lib/prisma");
    let dbUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (!dbUser) {
      // Check if user exists by email (migration from old JWT auth)
      dbUser = await prisma.user.findUnique({ where: { email } });

      if (dbUser) {
        // Update existing user's ID to Clerk ID
        dbUser = await prisma.user.update({
          where: { email },
          data: { id: user.id },
        });
      } else {
        // Create new user
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email,
            plan: "free",
          },
        });
      }
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name,
      plan: dbUser.plan,
    };
  } catch (e) {
    console.error("Session error:", e);
    return null;
  }
}

// Keep old functions for backwards compat (they'll just return null now)
export function signToken(user: SessionUser): string {
  return "clerk-managed";
}

export function verifyToken(token: string): SessionUser | null {
  return null;
}
