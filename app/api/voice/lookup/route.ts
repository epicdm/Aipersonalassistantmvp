/**
 * GET /api/voice/lookup?did=17678181234
 * Internal endpoint - voice agent server uses this to find agent by DID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/prisma'

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'bff-internal-2026'

export async function GET(req: NextRequest) {
  // Verify internal secret
  const secret = req.headers.get('x-internal-secret')
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const did = searchParams.get('did')
  if (!did) return NextResponse.json({ error: 'did required' }, { status: 400 })

  const prisma = getPrisma()

  // Find agent with this DID
  const agent = await prisma.agent.findFirst({
    where: {
      phoneNumber: did,
      phoneStatus: 'active',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      template: true,
      purpose: true,
      tone: true,
      whatsappPhone: true,
      config: true,
    },
  })

  if (!agent) {
    return NextResponse.json({ error: 'No agent found for DID' }, { status: 404 })
  }

  return NextResponse.json(agent)
}
