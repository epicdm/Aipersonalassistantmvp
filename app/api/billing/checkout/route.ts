/**
 * POST /api/billing/checkout
 * Creates a Fiserv checkout session for plan upgrade
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/app/lib/prisma'

const FISERV_API_URL = process.env.FISERV_API_URL || 'https://api01.epic.dm'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()
    if (!plan || !['pro', 'business'].includes(plan)) {
      return NextResponse.json({ error: 'Valid plan required: pro or business' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already on this plan or higher
    const planOrder: Record<string, number> = { free: 0, pro: 1, business: 2 }
    if ((planOrder[user.plan] ?? 0) >= (planOrder[plan] ?? 0)) {
      return NextResponse.json({
        error: `You are already on ${user.plan} plan or higher`,
      }, { status: 400 })
    }

    // Plan prices in cents
    const planPrices: Record<string, number> = {
      pro: 2900,      // $29.00
      business: 9900, // $99.00
    }

    const planLabels: Record<string, string> = {
      pro: 'BFF Pro Plan - $29/month',
      business: 'BFF Business Plan - $99/month',
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bff.epic.dm'

    // Call Fiserv via the n8n webhook (same pattern as ace-landing)
    const fiservResponse = await fetch(`${FISERV_API_URL}/n8n/webhook/bff-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        email: user.email,
        plan,
        amount: planPrices[plan],
        description: planLabels[plan],
        returnUrl: `${appUrl}/dashboard?upgraded=${plan}`,
        cancelUrl: `${appUrl}/upgrade`,
        webhookUrl: `${appUrl}/api/billing/webhook`,
      }),
    })

    if (!fiservResponse.ok) {
      const errorText = await fiservResponse.text()
      console.error('[Billing Checkout] Fiserv error:', errorText)
      return NextResponse.json({ error: 'Payment gateway error' }, { status: 500 })
    }

    const result = await fiservResponse.json()

    if (!result.success || !result.checkoutUrl) {
      return NextResponse.json({
        error: result.message || 'Failed to create checkout session',
      }, { status: 500 })
    }

    // Store pending upgrade
    await prisma.user.update({
      where: { id: userId },
      data: {
        pendingPlan: plan,
        pendingPlanSince: new Date(),
      },
    })

    return NextResponse.json({ success: true, checkoutUrl: result.checkoutUrl })
  } catch (error: any) {
    console.error('[Billing Checkout]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
