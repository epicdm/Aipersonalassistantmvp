/**
 * GET /api/voice/otp-pending
 * Internal endpoint — returns list of DIDs currently awaiting OTP verification.
 * Polled by isola-voice-agent.js on deepseek every 30s to detect OTP calls.
 *
 * A DID is "pending OTP" when tenantRegistry.status = 'pending_otp' AND didNumber is set.
 * The voice agent uses this to gracefully handle calls to these DIDs (OTP calls route
 * to voice00 via AGI, but in case a stray call hits Stasis, the agent can respond correctly).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET === undefined ? 'bff-internal-2026' : process.env.INTERNAL_SECRET

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (INTERNAL_SECRET && secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const pending = await prisma.tenantRegistry.findMany({
      where: {
        status: 'pending_otp',
        didNumber: { not: null },
      },
      select: { didNumber: true },
    })

    const dids = pending
      .map((r) => r.didNumber as string)
      .filter(Boolean)

    return NextResponse.json({ dids })
  } catch (err: any) {
    console.error('[voice/otp-pending]', err.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
