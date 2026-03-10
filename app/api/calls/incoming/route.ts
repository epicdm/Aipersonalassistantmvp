// POST /api/calls/incoming
// Called by Asterisk shell script when a PSTN call arrives for a customer DID
// Returns an answer token so the browser can join the LiveKit room
// GET /api/calls/incoming?userId=xxx — poll for pending incoming calls

import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { prisma } from '@/app/lib/prisma'

const LK_KEY = process.env.LIVEKIT_API_KEY || ''
const LK_SECRET = process.env.LIVEKIT_API_SECRET || ''
const LK_URL = process.env.LIVEKIT_URL || ''

// In-memory store for pending calls (simple, no extra DB table needed)
// Key: userId, Value: incoming call info
const pendingCalls = new Map<string, {
  roomName: string
  callerNumber: string
  did: string
  answerToken: string
  ts: number
}>()

// Asterisk notifies us of an incoming call
export async function POST(req: NextRequest) {
  const { did, callerNumber, roomName } = await req.json()
  if (!did || !roomName) return NextResponse.json({ error: 'did and roomName required' }, { status: 400 })

  // Find agent by DID
  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { didNumber: did },
        { didNumber: `+${did}` },
        { didNumber: did.replace(/^\+/, '') },
      ],
      isActive: true,
    },
    include: { user: { select: { id: true } } }
  })

  if (!agent) {
    console.warn('[Incoming Call] No agent found for DID:', did)
    return NextResponse.json({ error: 'No agent for DID' }, { status: 404 })
  }

  const userId = agent.user.id

  // Generate answer token (10 min — enough time to accept)
  const at = new AccessToken(LK_KEY, LK_SECRET, { identity: userId, ttl: '10m' })
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  const answerToken = await at.toJwt()

  // Store pending call
  pendingCalls.set(userId, {
    roomName,
    callerNumber: callerNumber || 'Unknown',
    did,
    answerToken,
    ts: Date.now(),
  })

  // Clean up stale calls older than 2 minutes
  const now = Date.now()
  for (const [k, v] of pendingCalls.entries()) {
    if (now - v.ts > 120_000) pendingCalls.delete(k)
  }

  return NextResponse.json({
    ok: true,
    agentId: agent.id,
    userId,
    roomName,
    lkUrl: LK_URL,
  })
}

// Browser polls this to check for incoming calls
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const call = pendingCalls.get(userId)
  if (!call) return NextResponse.json({ pending: false })

  // Return call info (don't delete yet — browser needs to confirm answer)
  return NextResponse.json({
    pending: true,
    roomName: call.roomName,
    callerNumber: call.callerNumber,
    did: call.did,
    answerToken: call.answerToken,
    lkUrl: LK_URL,
  })
}

// Browser calls this to dismiss/reject
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (userId) pendingCalls.delete(userId)
  return NextResponse.json({ ok: true })
}
