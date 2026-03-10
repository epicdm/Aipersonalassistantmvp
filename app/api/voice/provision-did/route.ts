/**
 * POST /api/voice/provision-did
 * Provisions a Magnus DID for a specific agent
 * Requires Pro or Business plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { provisionAgentDID } from '@/app/lib/magnus'

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await req.json()
    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    // Check plan
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user || (user.plan !== 'pro' && user.plan !== 'business')) {
      return NextResponse.json({
        error: 'Voice calling requires Pro or Business plan',
      }, { status: 403 })
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: sessionUser.id },
    })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Already provisioned?
    if (agent.didNumber && agent.didSipUser && agent.phoneStatus === 'active') {
      return NextResponse.json({
        success: true,
        didNumber: agent.didNumber,
        sipUsername: agent.didSipUser,
        sipServer: agent.didSipServer,
        alreadyProvisioned: true,
      })
    }

    // Provision from Magnus
    const result = await provisionAgentDID(agentId, agent.name, user.email || '')

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Provisioning failed',
      }, { status: 500 })
    }

    // Save to DB
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        didNumber: result.didNumber,
        didSipUser: result.sipUsername,
        didSipPass: result.sipPassword,
        didSipServer: result.sipServer,
        phoneNumber: result.didNumber,
        phoneStatus: 'active',
        config: {
          ...(agent.config as object || {}),
          voice: {
            didNumber: result.didNumber,
            sipUsername: result.sipUsername,
            sipServer: result.sipServer,
            magnusUserId: result.magnusUserId,
          },
        },
      },
    })

    console.log(`[Provision DID] Agent ${agentId}: ${result.didNumber}`)

    return NextResponse.json({
      success: true,
      didNumber: result.didNumber,
      sipUsername: result.sipUsername,
      sipServer: result.sipServer,
    })
  } catch (error: any) {
    console.error('[Provision DID]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')
    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: sessionUser.id },
      select: {
        didNumber: true,
        didSipUser: true,
        didSipServer: true,
        phoneNumber: true,
        phoneStatus: true,
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasDID: !!agent.didNumber,
      didNumber: agent.didNumber,
      sipUsername: agent.didSipUser,
      sipServer: agent.didSipServer,
      phoneStatus: agent.phoneStatus,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
