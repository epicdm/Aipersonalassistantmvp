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
  "/api/whatsapp/account-update(.*)",
  "/api/whatsapp/flows(.*)",
  "/api/internal/(.*)",
  "/api/cron/(.*)",
  "/api/voice/context(.*)",
  "/api/voice/lookup(.*)",
  "/api/voice/otp-callback(.*)",
  "/api/voice/otp-pending(.*)",
  "/api/billing/webhook(.*)",
  "/api/telegram/bff-ops(.*)",
  "/api/health",
  "/api/dashboard/(.*)",
  "/isola(.*)",
  "/api/isola/signup",
  "/api/isola/available-numbers",
  "/api/isola/provision-number",
  "/api/isola/provision-status",
  "/api/provision",
  "/api/onboard/isola",
  "/api/whatsapp/onboard(.*)",
  "/api/billing/subscribe",
  "/upgrade(.*)",
  "/demo(.*)",
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
      // Reconstruct public URL from forwarded headers (nginx proxies to localhost:3004)
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host  = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'bff.epic.dm'
      const publicUrl = `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
      return redirectToSignIn({ returnBackUrl: publicUrl });
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
