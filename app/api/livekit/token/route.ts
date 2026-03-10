import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk'

const LK_URL = process.env.LIVEKIT_URL || ''
const LK_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const AGENT_NAME = process.env.AGENT_NAME || 'epic-voice-agent'

// Convert wss:// to https:// for HTTP API calls
function wsToHttp(url: string) {
  return url.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://')
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!LK_API_KEY || !LK_API_SECRET || !LK_URL) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
  }

  const roomName = `agent-${userId}`

  // Create access token
  const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
    identity: userId,
    ttl: '1h',
  })
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  })
  const token = await at.toJwt()

  // Dispatch agent to the room
  try {
    const httpUrl = wsToHttp(LK_URL)
    const dispatchClient = new AgentDispatchClient(httpUrl, LK_API_KEY, LK_API_SECRET)
    await dispatchClient.createDispatch(roomName, AGENT_NAME, {
      metadata: JSON.stringify({ userId }),
    })
  } catch (err) {
    // Agent dispatch may fail if already dispatched or room doesn't exist yet — non-fatal
    console.warn('[LiveKit] Agent dispatch warning:', err)
  }

  return NextResponse.json({ token, url: LK_URL, roomName })
}
