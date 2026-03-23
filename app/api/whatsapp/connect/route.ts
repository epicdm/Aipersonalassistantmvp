import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — called by frontend after embedded signup completes
// Body: { code?: string, phone_number_id: string, waba_id: string, display_phone_number?: string }
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, phone_number_id, waba_id, display_phone_number } = await req.json()

  if (!phone_number_id || !waba_id) {
    return NextResponse.json({ error: 'Missing phone_number_id or waba_id' }, { status: 400 })
  }

  const META_TOKEN = process.env.META_WA_TOKEN || process.env.WHATSAPP_TOKEN || ''
  const APP_ID = process.env.META_APP_ID || ''
  const APP_SECRET = process.env.META_APP_SECRET || ''

  try {
    // Step 1: Exchange code for token (if code provided)
    let wabaToken = META_TOKEN
    if (code && APP_ID && APP_SECRET) {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}`
      )
      const tokenData = await tokenRes.json()
      if (tokenData.access_token) wabaToken = tokenData.access_token
    }

    // Step 2: Register the phone number to receive webhooks
    const regRes = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wabaToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: '000000',
        }),
      }
    )
    const regData = await regRes.json()
    console.log('[WA Connect] Register result:', regData)

    // Step 3: Subscribe the WABA to our app webhook
    const subRes = await fetch(
      `https://graph.facebook.com/v21.0/${waba_id}/subscribed_apps`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${wabaToken}` },
      }
    )
    const subData = await subRes.json()
    console.log('[WA Connect] Subscribe result:', subData)

    // Step 4: Find the user's agent and update it
    const agent = await prisma.agent.findFirst({
      where: { userId: user.id, status: { in: ['draft', 'active'] } },
      orderBy: { createdAt: 'desc' },
    })

    if (agent) {
      const phoneNumber = display_phone_number?.replace(/\D/g, '') || ''
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          config: {
            ...(agent.config as any || {}),
            wabaId: waba_id,
            phoneNumberId: phone_number_id,
            displayPhone: display_phone_number,
            whatsappConnected: true,
          },
        },
      })

      // Record the connection event
      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          type: 'whatsapp_connect',
          summary: `WhatsApp number ${display_phone_number || phone_number_id} connected`,
          metadata: {
            phone_number_id,
            waba_id,
            display_phone_number,
            phone_digits: phoneNumber,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      phone_number_id,
      waba_id,
      display_phone_number,
      registered: regData.success || false,
      subscribed: subData.success || false,
    })
  } catch (err: any) {
    console.error('[WA Connect]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — check if current user has a WhatsApp number connected
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agent = await prisma.agent.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const config = agent?.config as any
  if (config?.whatsappConnected && config?.phoneNumberId) {
    return NextResponse.json({
      connected: true,
      phone: config.displayPhone,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
    })
  }

  return NextResponse.json({ connected: false })
}
