import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { prisma } from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  // Set VAPID details inside handler so env vars are available at runtime
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@epic.dm'}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    // Bearer token auth
    const auth = req.headers.get('authorization')
    if (auth !== 'Bearer bff-internal-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { did, caller, roomName } = body

    if (!did) {
      return NextResponse.json({ error: 'Missing did' }, { status: 400 })
    }

    // Find agent by DID number
    const agent = await prisma.agent.findFirst({
      where: { didNumber: did },
      select: { userId: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for DID' }, { status: 404 })
    }

    // Get all push subscriptions for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: agent.userId },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found', sent: 0 })
    }

    const payload = JSON.stringify({
      title: '📞 Incoming Call',
      body: `From: ${caller || 'Unknown'}`,
      data: { roomName, caller, did },
    })

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    console.error('Push notify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
