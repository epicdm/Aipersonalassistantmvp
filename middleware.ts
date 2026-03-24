import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy",
  "/terms",
  "/login(.*)",
  "/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/business/scan",
  "/api/business/recommend",
  "/api/webhook(.*)",
  "/api/whatsapp/webhook(.*)",
  "/api/cron/(.*)",
  "/api/voice/context(.*)",
  "/api/billing/webhook(.*)",
  "/api/telegram/bff-ops(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      // API routes return 401, page routes redirect to sign-in
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return redirectToSignIn({ returnBackUrl: request.url });
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
