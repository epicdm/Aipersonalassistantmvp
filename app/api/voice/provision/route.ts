/**
 * POST /api/voice/provision
 * Provisions a DID from Magnus Billing for an agent
 * Called after agent creation when plan allows voice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { provisionAgentDID } from '@/app/lib/magnus'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await req.json()
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

    // prisma imported above

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    // Check plan allows voice (pro or business)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || dbUser.plan === 'free') {
      return NextResponse.json({ error: 'Voice calling requires Pro or Business plan' }, { status: 403 })
    }

    // Already provisioned?
    if (agent.phoneNumber && agent.phoneStatus === 'active') {
      return NextResponse.json({
        success: true,
        phoneNumber: agent.phoneNumber,
        already: true,
      })
    }

    // Provision DID from Magnus
    const result = await provisionAgentDID(agentId, agent.name, user.email || '')

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Provisioning failed' }, { status: 500 })
    }

    // Store in DB
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        phoneNumber: result.didNumber,
        phoneStatus: 'active',
        config: {
          ...(agent.config as object || {}),
          voice: {
            didNumber: result.didNumber,
            sipUsername: result.sipUsername,
            sipServer: result.sipServer,
            magnusUserId: result.magnusUserId,
            // Note: sipPassword stored separately, not in plain config
          },
        },
      },
    })

    // Store SIP password securely (separate field or env-encrypted)
    // For now log it - in production use a secrets manager
    console.log(`[Voice] Agent ${agentId} provisioned: ${result.didNumber} / SIP: ${result.sipUsername}`)

    return NextResponse.json({
      success: true,
      phoneNumber: result.didNumber,
      sipUsername: result.sipUsername,
      sipServer: result.sipServer,
    })
  } catch (error: any) {
    console.error('[Voice Provision]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

    // prisma imported above
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
      select: { phoneNumber: true, phoneStatus: true },
    })

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    return NextResponse.json({
      phoneNumber: agent.phoneNumber,
      phoneStatus: agent.phoneStatus,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
