/**
 * GET /api/voice/context?phone_number=+17671234567
 * Returns the agent's name, system_prompt, and owner info for a given phone number.
 * Used by the AudioSocket bridge to load per-agent personality when a call comes in.
 * This endpoint is PUBLIC (no auth) — phone numbers are not secret, just IDs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone_number')

    if (!phone) {
      return NextResponse.json({ error: 'phone_number required' }, { status: 400 })
    }

    // Normalize phone number — strip leading + or spaces
    const normalized = phone.replace(/\s+/g, '')

    // Look up agent by DID number or phone number
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { didNumber: normalized },
          { phoneNumber: normalized },
          { didNumber: phone },
          { phoneNumber: phone },
        ],
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            plan: true,
          },
        },
      },
    })

    if (!agent) {
      // Return default EPIC agent personality if no specific agent found
      return NextResponse.json({
        found: false,
        agentName: 'Jenny',
        systemPrompt: `You are Jenny, an AI voice assistant for EPIC Communications — a telecom and internet service provider in Dominica.
Be warm, helpful, and VERY concise. This is a voice call — maximum 2 short sentences per reply.
Never use markdown, lists, or special characters. Speak naturally as if on the phone.
You can help with: internet service, billing questions, technical support, and new sign-ups.
If you cannot help, offer to connect them with a human team member.`,
        voice: 'en-US-JennyNeural',
        ownerName: 'EPIC Communications',
        ownerEmail: null,
      })
    }

    // Build system prompt — use agent's custom instructions or fallback
    const agentConfig = (agent.config as Record<string, any>) || {}
    // Instructions can be in config.instructions, config.prompt, or the agent's soul field
    const customInstructions = agentConfig.instructions || agentConfig.prompt || agent.soul || ''

    let systemPrompt: string
    if (customInstructions && customInstructions.trim().length > 20) {
      // Use the agent's custom personality — wrap with voice constraints
      systemPrompt = `${customInstructions.trim()}

IMPORTANT VOICE RULES: This is a live phone call. Keep replies VERY short — max 2 sentences. Never use markdown, bullet points, or special characters. Speak naturally.`
    } else {
      // Default personality with agent name
      const agentName = agent.name || 'Jenny'
      const ownerName = agent.user?.email?.split('@')[0] || 'your service provider'
      systemPrompt = `You are ${agentName}, an AI voice assistant for ${ownerName}.
Be warm, helpful, and VERY concise. This is a voice call — maximum 2 short sentences per reply.
Never use markdown, lists, or special characters. Speak naturally as if on the phone.
If you cannot help, offer to connect them with a human.`
    }

    return NextResponse.json({
      found: true,
      agentId: agent.id,
      agentName: agent.name,
      systemPrompt,
      voice: agentConfig.voice || 'en-US-JennyNeural',
      ownerName: agent.user?.email?.split('@')[0] || null,
      ownerEmail: agent.user?.email || null,
      phoneNumber: agent.phoneNumber || agent.didNumber,
    })
  } catch (error: any) {
    console.error('[Voice Context]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
