/**
 * WhatsApp HSM Template Management
 * Meta Template API client for creating, listing, sending, and deleting
 * message templates. Required for outbound messages outside the 24h window.
 */

import { metaFetch } from '@/app/lib/api-retry'

const META_TOKEN = process.env.META_WA_TOKEN || ''
const WABA_ID = process.env.META_WABA_ID || ''

// ─── Template CRUD ────────────────────────────────────────────────────────────

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[]
  example?: { body_text?: string[][] }
}

export interface CreateTemplateParams {
  name: string
  language: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  components: TemplateComponent[]
}

export async function createTemplate(params: CreateTemplateParams) {
  if (!META_TOKEN || !WABA_ID) throw new Error('META_WA_TOKEN and META_WABA_ID required')

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${WABA_ID}/message_templates`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify(params),
    }
  )

  return res.json()
}

export async function getTemplates(status?: string) {
  if (!META_TOKEN || !WABA_ID) throw new Error('META_WA_TOKEN and META_WABA_ID required')

  const url = new URL(`https://graph.facebook.com/v25.0/${WABA_ID}/message_templates`)
  url.searchParams.set('fields', 'name,language,status,category,components')
  url.searchParams.set('limit', '100')
  if (status) url.searchParams.set('status', status)

  const res = await metaFetch(url.toString(), {
    headers: { Authorization: `Bearer ${META_TOKEN}` },
  })

  const data = await res.json()
  return data.data || []
}

export async function deleteTemplate(name: string) {
  if (!META_TOKEN || !WABA_ID) throw new Error('META_WA_TOKEN and META_WABA_ID required')

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${META_TOKEN}` },
    }
  )

  return res.json()
}

// ─── Send Template ────────────────────────────────────────────────────────────

export interface TemplateVariable {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
  image?: { link: string }
  document?: { link: string; filename: string }
  video?: { link: string }
}

export async function sendTemplate(
  phone: string,
  templateName: string,
  language: string,
  variables?: TemplateVariable[],
  fromPhoneId?: string
) {
  const token = META_TOKEN
  if (!token) throw new Error('META_WA_TOKEN required')
  const phoneId = fromPhoneId || process.env.WHATSAPP_PHONE_ID || ''

  const components: any[] = []
  if (variables && variables.length > 0) {
    components.push({
      type: 'body',
      parameters: variables.map(v => {
        if (v.type === 'text') return { type: 'text', text: v.text }
        if (v.type === 'currency') return { type: 'currency', ...v.currency }
        if (v.type === 'date_time') return { type: 'date_time', ...v.date_time }
        if (v.type === 'image') return { type: 'image', image: v.image }
        if (v.type === 'document') return { type: 'document', document: v.document }
        if (v.type === 'video') return { type: 'video', video: v.video }
        return { type: 'text', text: v.text || '' }
      }),
    })
  }

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          ...(components.length ? { components } : {}),
        },
      }),
    }
  )

  return res.json()
}

// ─── Authentication Template ──────────────────────────────────────────────────

export async function sendAuthTemplate(
  phone: string,
  otp: string,
  templateName = 'auth_otp',
  language = 'en_US',
  fromPhoneId?: string
) {
  const token = META_TOKEN
  if (!token) throw new Error('META_WA_TOKEN required')
  const phoneId = fromPhoneId || process.env.WHATSAPP_PHONE_ID || ''

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
    }
  )

  return res.json()
}

// ─── 24h Window Check ─────────────────────────────────────────────────────────

import { prisma } from '@/app/lib/prisma'

/**
 * Check if a contact is within the 24h messaging window for a specific agent.
 * If inside window, send direct message. If outside, must use approved template.
 */
export async function isWithin24hWindow(agentId: string, contactId: string): Promise<boolean> {
  const agentContact = await prisma.agentContact.findUnique({
    where: { agentId_contactId: { agentId, contactId } },
    select: { lastInboundAt: true },
  })

  if (!agentContact?.lastInboundAt) return false

  const hoursSince = (Date.now() - agentContact.lastInboundAt.getTime()) / (1000 * 60 * 60)
  return hoursSince < 24
}

/**
 * Update the lastInboundAt timestamp when a contact sends us a message.
 * Call this in the webhook handler for every inbound message.
 */
export async function touchInboundTimestamp(agentId: string, contactId: string): Promise<void> {
  await prisma.agentContact.update({
    where: { agentId_contactId: { agentId, contactId } },
    data: { lastInboundAt: new Date() },
  }).catch(() => null) // Graceful — agentContact may not exist yet
}
