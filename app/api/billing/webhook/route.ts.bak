/**
 * POST /api/billing/webhook
 * Handles Fiserv payment success webhook
 * Updates user plan and provisions DIDs for Pro/Business plans
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { provisionDID } from '@/app/lib/did-provisioner'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const { userId, plan, success, transactionId } = payload

    if (!userId || !plan || success !== true) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    // Get user with active agents
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agents: {
          where: { isActive: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user plan
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        pendingPlan: null,
        pendingPlanSince: null,
        lastBillingDate: new Date(),
      },
    })

    console.log(`[Billing Webhook] User ${userId} upgraded to ${plan} (tx: ${transactionId})`)

    // Provision DIDs for Pro/Business upgrades
    if (plan === 'pro' || plan === 'business') {
      const agents = user.agents
      const maxAgents = plan === 'pro' ? 3 : agents.length
      const toProvision = agents.slice(0, maxAgents)

      let provisioned = 0
      const errors: string[] = []

      for (const agent of toProvision) {
        // Skip if already has DID
        if (agent.didNumber && agent.phoneStatus === 'active') {
          console.log(`[Billing Webhook] Agent ${agent.id} already has DID ${agent.didNumber}, skipping`)
          continue
        }

        // Determine WhatsApp phone for notification: agent-bound → user's primary
        const whatsappPhone =
          agent.whatsappPhone || agent.whatsappNumber || user.whatsappPhone || ''

        try {
          const result = await provisionDID(agent.id, whatsappPhone)

          if (result.success) {
            provisioned++
            console.log(`[Billing Webhook] Provisioned DID ${result.didNumber} for agent ${agent.id}`)
          } else {
            const errMsg = `Agent ${agent.id}: ${result.error}`
            errors.push(errMsg)
            console.error(`[Billing Webhook] DID provision failed - ${errMsg}`)
          }
        } catch (err: any) {
          const errMsg = `Agent ${agent.id}: ${err.message}`
          errors.push(errMsg)
          console.error(`[Billing Webhook] Error for agent ${agent.id}:`, err.message)
        }
      }

      return NextResponse.json({
        success: true,
        plan,
        agentsProvisioned: provisioned,
        ...(errors.length ? { provisionErrors: errors } : {}),
      })
    }

    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    console.error('[Billing Webhook]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Billing webhook endpoint active' })
}
