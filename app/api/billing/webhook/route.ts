/**
 * POST /api/billing/webhook
 * Handles both Stripe and legacy Fiserv payment webhooks.
 * Stripe: checkout.session.completed → trigger provisioning for Flow signups.
 * Fiserv: payment success → upgrade user plan + provision DIDs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { alertEric } from '@/app/lib/alert'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  // ── Stripe webhook (detected by stripe-signature header) ──────────────
  const stripeSignature = req.headers.get('stripe-signature')
  if (stripeSignature && STRIPE_WEBHOOK_SECRET) {
    return handleStripeWebhook(req, stripeSignature)
  }

  // ── Legacy Fiserv webhook (no stripe-signature header) ────────────────
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

// ── Stripe webhook handler ────────────────────────────────────────────────

async function handleStripeWebhook(req: NextRequest, signature: string): Promise<NextResponse> {
  const body = await req.text()

  let event: any
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[billing/stripe] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  console.log('[billing/stripe] Event:', event.type, event.id)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const flowToken = session.metadata?.flow_token

    if (!flowToken) {
      console.log('[billing/stripe] No flow_token in metadata — skipping')
      return NextResponse.json({ ok: true })
    }

    const signup = await prisma.pendingSignup.findUnique({ where: { flowToken } })
    if (!signup) {
      console.error('[billing/stripe] flow_token not found:', flowToken)
      await alertEric(`Stripe payment for unknown flow_token: ${flowToken}`)
      return NextResponse.json({ ok: true })
    }

    // Idempotency
    if (['provisioning', 'active'].includes(signup.status)) {
      console.log('[billing/stripe] Already processing — skipping duplicate:', flowToken)
      return NextResponse.json({ ok: true })
    }

    // Trigger provisioning
    try {
      await prisma.pendingSignup.update({ where: { flowToken }, data: { status: 'provisioning' } })

      const provRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/api/isola/provision-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_SECRET || '',
        },
        body: JSON.stringify({
          did: signup.reservedDid,
          businessName: signup.businessName,
          template: signup.template || 'professional',
          email: signup.email,
          flowToken,
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!provRes.ok) throw new Error(`Provision returned ${provRes.status}`)

      const result = await provRes.json()
      await prisma.pendingSignup.update({
        where: { flowToken },
        data: { tenantId: result.tenantId },
      })

      const { sendWhatsAppMessage } = await import('@/app/lib/whatsapp')
      await sendWhatsAppMessage(signup.phone,
        `Payment received! Setting up your AI agent now... We'll message you in about 60 seconds.`
      )
    } catch (err: any) {
      console.error('[billing/stripe] Post-payment provision failed:', err.message)
      await prisma.pendingSignup.update({
        where: { flowToken },
        data: { status: 'provision_failed', errorMessage: err.message },
      })
      await alertEric(`PAYMENT RECEIVED but provisioning FAILED for ${flowToken}. Customer ${signup.phone} paid but has no agent! Error: ${err.message}`)
    }
  } else if (event.type === 'checkout.session.expired') {
    const flowToken = event.data.object?.metadata?.flow_token
    if (flowToken) {
      await prisma.pendingSignup.update({
        where: { flowToken },
        data: { status: 'payment_expired' },
      }).catch(() => null)
    }
  }

  return NextResponse.json({ ok: true })
}
