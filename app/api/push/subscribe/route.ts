import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/app/lib/session"
import { prisma } from "@/app/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { endpoint, keys } = await request.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "endpoint and keys required" }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("push/subscribe:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 })

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("push/subscribe DELETE:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
