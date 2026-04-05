/**
 * POST /api/internal/checkout
 * Internal endpoint — creates a Stripe Checkout Session for a product.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, productId, productName, price, customerPhone, currency? }
 * Returns: { url }
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { validateInternalSecret } from '@/app/lib/internal-auth'

const BFF_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bff.epic.dm'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

export async function POST(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agentId, productId, productName, price, customerPhone, currency = 'usd' } = body

  if (!agentId || !productId || !productName || price == null || !customerPhone) {
    return NextResponse.json(
      { error: 'agentId, productId, productName, price, customerPhone required' },
      { status: 400 },
    )
  }

  if (typeof price !== 'number' || price <= 0) {
    return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency as string,
            product_data: { name: productName as string },
            // Stripe unit_amount is in smallest currency unit (cents)
            unit_amount: Math.round((price as number) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${BFF_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BFF_URL}/`,
      metadata: {
        agentId: agentId as string,
        productId: productId as string,
        customerPhone: customerPhone as string,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[internal/checkout] Stripe error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
