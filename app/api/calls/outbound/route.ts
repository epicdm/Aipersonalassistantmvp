// POST /api/calls/outbound
// Body: { toNumber: string, agentId: string }
// Creates a LiveKit SIP participant that dials a PSTN number via Asterisk → Magnus
// Browser joins the same LiveKit room to participate in the call

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { AccessToken, SipClient } from 'livekit-server-sdk'
import { prisma } from '@/app/lib/prisma'

const LK_URL = process.env.LIVEKIT_URL || ''
const LK_KEY = process.env.LIVEKIT_API_KEY || ''
const LK_SECRET = process.env.LIVEKIT_API_SECRET || ''
// EPIC Shared Inbound trunk — allows BFF (66.118.37.63), Magnus, FusionPBX
const LK_TRUNK_ID = 'ST_WEc3Hz4Xerb9'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toNumber, agentId } = await req.json()
  if (!toNumber) return NextResponse.json({ error: 'toNumber required' }, { status: 400 })

  // Normalize to E.164
  const digits = toNumber.replace(/\D/g, '')
  const e164 = digits.startsWith('1') && digits.length === 11
    ? `+${digits}`
    : digits.length === 10
    ? `+1${digits}`
    : `+${digits}`

  // Get agent's DID for caller ID
  const agent = agentId ? await prisma.agent.findFirst({
    where: { id: agentId, userId },
    select: { id: true, didNumber: true, phoneNumber: true, plan: true }
  }) : null

  // Check plan allows voice calling
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
  if (userRecord?.plan === 'free') {
    return NextResponse.json({ error: 'Voice calling requires Pro plan', upgrade: true }, { status: 403 })
  }

  const roomName = `call-${userId}-${Date.now()}`

  // Create LiveKit SIP participant — LiveKit dials Asterisk which routes to Magnus → PSTN
  const httpUrl = LK_URL.replace('wss://', 'https://').replace('ws://', 'http://')
  const sip = new SipClient(httpUrl, LK_KEY, LK_SECRET)

  await sip.createSipParticipant(
    LK_TRUNK_ID,
    e164,
    roomName,
    {
      participantIdentity: `pstn-${digits}`,
      participantName: `Call to ${e164}`,
      playRingtone: true,
    }
  )

  // Generate browser token to join same room
  const at = new AccessToken(LK_KEY, LK_SECRET, {
    identity: userId,
    ttl: '1h',
  })
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  const token = await at.toJwt()

  return NextResponse.json({ token, url: LK_URL, roomName, toNumber: e164 })
}
