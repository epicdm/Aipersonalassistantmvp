/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events for both:
 * 1. Dashboard subscription upgrades (checkout.session.completed for subscriptions)
 * 2. Flow signup payments (checkout.session.completed with flow_token metadata)
 * 3. Recurring billing (invoice.paid, invoice.payment_failed)
 * 4. Subscription lifecycle (customer.subscription.updated, deleted)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { alertEric } from '@/app/lib/alert'
import { logWebhook, markWebhookProcessed, markWebhookFailed } from '@/app/lib/webhook-log'
import Stripe from 'stripe'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  // Log raw webhook before processing
  const logId = await logWebhook('stripe', { body: body.slice(0, 5000), hasSignature: !!signature })

  if (!signature || !WEBHOOK_SECRET) {
    await markWebhookFailed(logId, 'Missing signature or webhook secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[billing/stripe] Signature verification failed:', err.message)
    await markWebhookFailed(logId, `Signature failed: ${err.message}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  console.log('[billing/stripe] Event:', event.type, event.id)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log('[billing/stripe] Unhandled event type:', event.type)
    }

    await markWebhookProcessed(logId)
  } catch (err: any) {
    console.error('[billing/stripe] Handler error:', err.message)
    await markWebhookFailed(logId, err.message)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'Billing webhook endpoint active' })
}

// ── Checkout completed ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const flowToken = session.metadata?.flow_token
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  // Flow signup path (WhatsApp Flow → Stripe → provision)
  if (flowToken) {
    return handleFlowSignupPayment(session, flowToken)
  }

  // Dashboard upgrade path (user clicked Upgrade → Stripe → plan change)
  if (userId && plan) {
    return handleDashboardUpgrade(userId, plan, session)
  }

  console.log('[billing/stripe] checkout.session.completed with no recognized metadata')
}

async function handleFlowSignupPayment(session: Stripe.Checkout.Session, flowToken: string) {
  const signup = await prisma.pendingSignup.findUnique({ where: { flowToken } })
  if (!signup) {
    console.error('[billing/stripe] flow_token not found:', flowToken)
    await alertEric(`Stripe payment for unknown flow_token: ${flowToken}`)
    return
  }

  // Idempotency
  if (['provisioning', 'active'].includes(signup.status)) {
    console.log('[billing/stripe] Already processing — skipping duplicate:', flowToken)
    return
  }

  try {
    await prisma.pendingSignup.update({ where: { flowToken }, data: { status: 'provisioning' } })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'
    const provRes = await fetch(`${baseUrl}/api/isola/provision-number`, {
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
}

async function handleDashboardUpgrade(userId: string, plan: string, session: Stripe.Checkout.Session) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
    },
  })

  // Update or create Subscription record
  const subscriptionId = session.subscription as string
  if (subscriptionId) {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        id: subscriptionId,
        userId,
        plan,
        status: 'active',
        amount: plan === 'pro' ? 2900 : 9900,
        updatedAt: new Date(),
      },
      update: {
        plan,
        status: 'active',
        amount: plan === 'pro' ? 2900 : 9900,
        updatedAt: new Date(),
      },
    })
  }

  console.log(`[billing/stripe] User ${userId} upgraded to ${plan}`)
}

// ── Invoice paid (recurring) ──────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  if (!customerId) return

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })
  if (!user) {
    console.log('[billing/stripe] invoice.paid for unknown customer:', customerId)
    return
  }

  // Update subscription period
  const subscriptionId = invoice.subscription as string
  if (subscriptionId) {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId)
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: 'active',
        currentPeriodEnd: new Date(sub.items.data[0]?.current_period_end ?? Date.now()),
        updatedAt: new Date(),
      },
    }).catch(() => null)
  }

  console.log(`[billing/stripe] Invoice paid for user ${user.id}`)
}

// ── Invoice failed ────────────────────────────────────────────────────────────

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  if (!customerId) return

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })
  if (!user) return

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'past_due' },
  })

  await alertEric(`Payment failed for ${user.email} (${user.plan} plan). Stripe will retry.`)
  console.log(`[billing/stripe] Invoice failed for user ${user.id}`)
}

// ── Subscription updated ──────────────────────────────────────────────────────

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const planMap: Record<string, string> = {}
  // Build reverse map from price IDs to plan names
  if (process.env.STRIPE_PRICE_PRO) planMap[process.env.STRIPE_PRICE_PRO] = 'pro'
  if (process.env.STRIPE_PRICE_BUSINESS) planMap[process.env.STRIPE_PRICE_BUSINESS] = 'business'

  const priceId = subscription.items.data[0]?.price?.id || ''
  const newPlan = planMap[priceId] || 'pro'

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: newPlan,
      subscriptionPlan: newPlan,
      subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status,
    },
  })

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: newPlan,
      status: subscription.status,
      updatedAt: new Date(),
    },
  }).catch(() => null)

  console.log(`[billing/stripe] Subscription updated for ${userId}: ${newPlan} (${subscription.status})`)
}

// ── Subscription deleted (cancelled) ──────────────────────────────────────────

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'free',
      subscriptionPlan: null,
      subscriptionStatus: 'cancelled',
    },
  })

  await prisma.subscription.update({
    where: { userId },
    data: { status: 'cancelled', updatedAt: new Date() },
  }).catch(() => null)

  await alertEric(`User ${userId} subscription cancelled. Downgraded to free.`)
  console.log(`[billing/stripe] Subscription deleted for ${userId}`)
}

// ── Checkout expired ──────────────────────────────────────────────────────────

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const flowToken = session.metadata?.flow_token
  if (flowToken) {
    await prisma.pendingSignup.update({
      where: { flowToken },
      data: { status: 'payment_expired' },
    }).catch(() => null)
  }
}
