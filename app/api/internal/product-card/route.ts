/**
 * POST /api/internal/product-card
 * Send a product card to a customer via WhatsApp.
 * Uses Meta product message if catalogId is configured, otherwise formatted text.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, customerPhone, productId, productName, price, description?, imageUrl? }
 * Response: { sent: true, method: 'product_message' | 'text', productId, productName, price }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'
import { sendProductMessage, sendWhatsAppMessage } from '@/app/lib/whatsapp'

export async function POST(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agentId, customerPhone, productId, productName, price, description, imageUrl } = body

  if (!agentId || !customerPhone || !productId || !productName || price === undefined) {
    return NextResponse.json({ error: 'agentId, customerPhone, productId, productName, price required' }, { status: 400 })
  }

  if (typeof price !== 'number' || price <= 0) {
    return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 })
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId as string },
      select: { config: true, didNumber: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const config = (agent.config as Record<string, unknown>) || {}
    const catalogId = config.catalogId as string | undefined

    if (catalogId && productId) {
      // Use Meta interactive product message
      await sendProductMessage(
        customerPhone as string,
        catalogId,
        productId as string,
        `${description || productName as string}\n\nPrice: $${price}`,
        'Reply "buy" to purchase'
      )
      return NextResponse.json({
        sent: true,
        method: 'product_message',
        productId,
        productName,
        price,
      })
    }

    // Fallback: formatted text message
    const desc = description ? `${description}\n\n` : ''
    const text = `*${productName}*\n${desc}Price: $${price}\n\nReply "buy" to purchase.`
    await sendWhatsAppMessage(customerPhone as string, text)

    return NextResponse.json({
      sent: true,
      method: 'text',
      productId,
      productName,
      price,
    })
  } catch (err) {
    console.error('[internal/product-card] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
