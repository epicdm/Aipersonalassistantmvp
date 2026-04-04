import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — DEPRECATED. Use POST /api/isola/signup for Embedded Signup.
// This endpoint is kept for backward compatibility but will be removed.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use POST /api/isola/signup for Embedded Signup.' },
    { status: 410 }
  )
}

// GET — check if current user has a WhatsApp number connected
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agent = await prisma.agent.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const config = agent?.config as any
  if (config?.whatsappConnected && config?.phoneNumberId) {
    return NextResponse.json({
      connected: true,
      phone: config.displayPhone,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
    })
  }

  return NextResponse.json({ connected: false })
}
