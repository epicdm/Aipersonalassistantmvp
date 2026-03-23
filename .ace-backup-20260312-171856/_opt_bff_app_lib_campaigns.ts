import crypto from 'crypto'
import { prisma } from '@/app/lib/prisma'

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN || ''
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || process.env.META_PHONE_ID || '1003873729481088'
const WA_API_URL = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`

export function makeId() {
  return crypto.randomUUID()
}

export function getUserPlan(user: any) {
  return user?.subscriptionPlan || user?.plan || 'free'
}

export function ensureCampaignAccess(plan: string) {
  if (plan === 'free') {
    const error = new Error('Campaigns and broadcasts require a Pro or Business plan.')
    ;(error as any).status = 403
    throw error
  }
}

export function fillMergeTags(template: string, agent: any, contact: any) {
  const config = agent?.config && typeof agent.config === 'object' ? agent.config : {}
  const knowledge = config && typeof config.knowledge === 'object' ? config.knowledge : {}
  const customFields = contact?.customFields && typeof contact.customFields === 'object' ? contact.customFields : {}

  const replacements: Record<string, string> = {
    '{name}': contact?.name || 'there',
    '{business}': knowledge?.businessName || agent?.name || 'our business',
    '{amount}': customFields?.amount != null ? String(customFields.amount) : '',
    '{date}': customFields?.dueDate != null ? String(customFields.dueDate) : '',
    '{agent_name}': agent?.name || 'Jenny',
  }

  return Object.entries(replacements).reduce(
    (output, [tag, value]) => output.split(tag).join(value),
    template
  )
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!WHATSAPP_TOKEN) {
    console.log(`[Campaign Mock→${phone}] ${message}`)
    return { success: true }
  }

  try {
    const res = await fetch(WA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

export async function runBroadcastSkeleton(broadcastId: string, userId: string) {
  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, userId },
    include: {
      agent: true,
      recipients: true,
    },
  })

  if (!broadcast) {
    const error = new Error('Broadcast not found')
    ;(error as any).status = 404
    throw error
  }

  if (broadcast.scheduledAt && broadcast.scheduledAt.getTime() > Date.now()) {
    await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: 'scheduled' } })
    return { mode: 'scheduled', broadcast }
  }

  if (!broadcast.recipients.length) {
    const error = new Error('No recipients found for this broadcast')
    ;(error as any).status = 400
    throw error
  }

  await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: 'sending' } })

  let sentCount = 0
  let failedCount = 0

  for (const recipient of broadcast.recipients) {
    const contact = await prisma.contact.findFirst({
      where: { userId: broadcast.userId, phone: recipient.phone },
    })

    const rendered = fillMergeTags(broadcast.message, broadcast.agent, contact || recipient)
    const result = await sendWhatsAppMessage(recipient.phone, rendered)

    if (result.success) {
      sentCount += 1
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: 'sent', sentAt: new Date(), error: null },
      })
    } else {
      failedCount += 1
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: 'failed', error: result.error || 'Send failed' },
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  const status = sentCount > 0 ? 'sent' : 'failed'
  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: {
      status,
      sentCount,
      failedCount,
      sentAt: new Date(),
    },
  })

  return { mode: 'sent', sentCount, failedCount }
}
