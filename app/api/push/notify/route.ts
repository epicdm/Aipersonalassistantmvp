import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/app/lib/prisma"
import webpush from "web-push"

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL || "admin@epic.dm"}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(request: NextRequest) {
  // Internal only — bearer token auth
  const auth = request.headers.get("authorization") || ""
  if (auth !== "Bearer bff-internal-2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { did, caller, roomName } = await request.json()

    // Find which agent owns this DID
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { didNumber: did },
          { phoneNumber: did },
          { didNumber: did?.replace(/^\+1/, "") },
          { phoneNumber: did?.replace(/^\+1/, "") },
        ],
      },
      select: { userId: true, name: true },
    })

    if (!agent) {
      console.log(`push/notify: no agent found for DID ${did}`)
      return NextResponse.json({ ok: true, sent: 0 })
    }

    // Get all push subscriptions for this user
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: agent.userId },
    })

    if (subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title: "📞 Incoming Call",
      body: `From: ${caller || "Unknown"}`,
      data: { roomName, caller, did },
    })

    let sent = 0
    const staleEndpoints: string[] = []

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          sent++
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode
          if (status === 410 || status === 404) {
            // Subscription expired — clean up
            staleEndpoints.push(sub.endpoint)
          } else {
            console.error("push send error:", err)
          }
        }
      }),
    )

    // Clean up expired subscriptions
    if (staleEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: staleEndpoints } } })
    }

    return NextResponse.json({ ok: true, sent })
  } catch (e) {
    console.error("push/notify:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
