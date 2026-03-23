import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk'
import { prisma } from '@/app/lib/prisma'

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

  // Load agent config to pass context to the voice agent
  // The voice agent uses the same soul/context as the text agent
  let agentMeta: Record<string, any> = { userId }
  try {
    const agent = await prisma.agent.findFirst({
      where: { userId },
      select: {
        id: true,
        name: true,
        soul: true,
        purpose: true,
        tone: true,
        template: true,
        config: true,
      },
    })
    if (agent) {
      const cfg = (agent.config as Record<string, any>) || {}
      agentMeta = {
        userId,
        agentId: agent.id,
        agentName: agent.name,
        template: agent.template,
        purpose: agent.purpose || '',
        tone: agent.tone || '',
        soul: agent.soul || '',
        // Pass call routing context so the voice agent knows the handoff instructions
        handoffInstructions: cfg.callRouting?.handoffInstructions || '',
        callRouting: cfg.callRouting || {},
      }
    }
  } catch (err) {
    console.warn('[LiveKit] Could not load agent context:', err)
  }

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

  // Dispatch agent to the room with full context metadata
  try {
    const httpUrl = wsToHttp(LK_URL)
    const dispatchClient = new AgentDispatchClient(httpUrl, LK_API_KEY, LK_API_SECRET)
    await dispatchClient.createDispatch(roomName, AGENT_NAME, {
      metadata: JSON.stringify(agentMeta),
    })
  } catch (err) {
    // Agent dispatch may fail if already dispatched or room doesn't exist yet — non-fatal
    console.warn('[LiveKit] Agent dispatch warning:', err)
  }

  return NextResponse.json({ token, url: LK_URL, roomName })
}
