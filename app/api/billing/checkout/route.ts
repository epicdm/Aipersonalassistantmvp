/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for plan upgrade.
 * Returns { url } for redirect to Stripe-hosted checkout.
 *
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for subscription management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/app/lib/prisma'
import Stripe from 'stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bff.epic.dm'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

// Stripe Price IDs — set these in .env or create them in Stripe Dashboard
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO || '',
  business: process.env.STRIPE_PRICE_BUSINESS || '',
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // ── Portal session (manage existing subscription) ─────────────────────
    if (body.action === 'portal') {
      return handlePortal(userId)
    }

    // ── Checkout session (new subscription) ───────────────────────────────
    const { plan } = body
    if (!plan || !['pro', 'business'].includes(plan)) {
      return NextResponse.json({ error: 'Valid plan required: pro or business' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already on this plan or higher
    const planOrder: Record<string, number> = { free: 0, pro: 1, business: 2 }
    if ((planOrder[user.plan] ?? 0) >= (planOrder[plan] ?? 0)) {
      return NextResponse.json({ error: `Already on ${user.plan} or higher` }, { status: 400 })
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 500 })
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { userId, clerkId: user.clerkId || '' },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create Checkout Session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?upgraded=${plan}`,
      cancel_url: `${APP_URL}/dashboard/billing`,
      metadata: { userId, plan },
      subscription_data: {
        metadata: { userId, plan },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[Billing Checkout]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

async function handlePortal(userId: string): Promise<NextResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}
