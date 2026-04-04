import crypto from 'crypto'
import { prisma } from '@/app/lib/prisma'

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN || ''
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || process.env.META_PHONE_ID || '1003873729481088'
const WA_API_URL = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_ID}/messages`

type CampaignWithRelations = Awaited<ReturnType<typeof getScopedCampaign>>

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

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

export function normalizePhones(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.map((phone) => String(phone || '').trim()).filter(Boolean))]
}

export function buildCampaignAudienceFilter(input: unknown, existing?: unknown) {
  const base = asObject(existing)
  const body = asObject(input)
  return {
    ...base,
    ...asObject(body.audienceFilter),
    tags: Array.isArray(body.tags) ? body.tags : Array.isArray(base.tags) ? base.tags : [],
    custom: Array.isArray(body.custom) ? body.custom : Array.isArray(base.custom) ? base.custom : [],
    message: body.message ?? body.audienceFilter?.message ?? base.message ?? '',
    phones: body.phones != null ? normalizePhones(body.phones) : normalizePhones(base.phones),
    scheduledAt: body.scheduledAt ?? body.audienceFilter?.scheduledAt ?? base.scheduledAt ?? null,
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
    return { success: false, error: "WHATSAPP_TOKEN not configured" }
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

export async function getScopedCampaign(id: string, userId: string) {
  return prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      Agent: true,
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
  })
}

export function getCampaignKind(campaign: { type?: string } | null | undefined) {
  return campaign?.type === 'broadcast' ? 'broadcast' : 'campaign'
}

export function toBroadcastCompat(campaign: any) {
  const audienceFilter = asObject(campaign?.audienceFilter)
  const phones = normalizePhones(audienceFilter.phones)
  return {
    id: campaign.id,
    userId: campaign.userId,
    agentId: campaign.agentId,
    name: campaign.name,
    message: typeof audienceFilter.message === 'string' ? audienceFilter.message : campaign.CampaignStep?.[0]?.message || '',
    status: campaign.status,
    scheduledAt: audienceFilter.scheduledAt ? new Date(audienceFilter.scheduledAt) : null,
    recipientCount: phones.length,
    sentCount: campaign.CampaignEnrollment?.filter((item: any) => item.status === 'completed').length || 0,
    failedCount: campaign.CampaignEnrollment?.filter((item: any) => item.status === 'cold').length || 0,
    sentAt: campaign.status === 'completed' ? campaign.updatedAt : null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    agent: campaign.Agent ? { id: campaign.Agent.id, name: campaign.Agent.name } : undefined,
    recipients: phones.map((phone) => ({
      id: `${campaign.id}:${phone}`,
      phone,
      status: 'pending',
      sentAt: null,
      error: null,
    })),
  }
}

async function ensureContact(agent: any, phone: string) {
  let contact = await prisma.contact.findFirst({
    where: { userId: agent.userId, phone },
  })

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: agent.userId,
        primaryAgentId: agent.id,
        phone,
        name: phone,
        channel: 'whatsapp',
      },
    })
  }

  const link = await prisma.agentContact.findFirst({
    where: { agentId: agent.id, contactId: contact.id },
  })

  if (!link) {
    await prisma.agentContact.create({
      data: {
        id: makeId(),
        agentId: agent.id,
        contactId: contact.id,
        lastContactAt: new Date(),
      },
    }).catch(() => null)
  } else {
    await prisma.agentContact.update({
      where: { id: link.id },
      data: { lastContactAt: new Date() },
    }).catch(() => null)
  }

  return contact
}

async function ensureCustomerConversation(agent: any, contactId: string, phone: string, preview: string) {
  const existing = await prisma.conversation.findFirst({
    where: { agentId: agent.id, phone, sessionType: 'customer' },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return prisma.conversation.update({
      where: { id: existing.id },
      data: {
        userId: agent.userId,
        contactId,
        channel: 'whatsapp',
        status: 'active',
        lastMessageAt: new Date(),
        lastMessagePreview: preview.slice(0, 200),
      },
    })
  }

  return prisma.conversation.create({
    data: {
      userId: agent.userId,
      agentId: agent.id,
      contactId,
      phone,
      channel: 'whatsapp',
      sessionType: 'customer',
      status: 'active',
      lastMessageAt: new Date(),
      lastMessagePreview: preview.slice(0, 200),
    },
  })
}

async function upsertEnrollment(campaignId: string, contactId: string, data: { status: string; exitReason?: string | null; exitedAt?: Date | null }) {
  const existing = await prisma.campaignEnrollment.findFirst({
    where: { campaignId, contactId },
  })

  if (existing) {
    return prisma.campaignEnrollment.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.campaignEnrollment.create({
    data: {
      id: makeId(),
      campaignId,
      contactId,
      currentStep: 1,
      ...data,
    },
  })
}

function needsMergeData(template: string) {
  return {
    amount: template.includes('{amount}'),
    date: template.includes('{date}'),
  }
}

export async function getCampaignStats(id: string, userId: string) {
  const campaign = await getScopedCampaign(id, userId)
  if (!campaign) {
    const error = new Error('Campaign not found')
    ;(error as any).status = 404
    throw error
  }

  const audienceFilter = asObject(campaign.audienceFilter)
  const phoneCount = normalizePhones(audienceFilter.phones).length
  const enrollmentCount = campaign.CampaignEnrollment.length
  const replies = campaign.CampaignEnrollment.filter((item) => item.exitReason === 'replied').length
  const conversions = campaign.CampaignEnrollment.filter((item) => item.exitReason === 'goal_met').length
  const completed = campaign.CampaignEnrollment.filter((item) => item.status === 'completed').length
  const cold = campaign.CampaignEnrollment.filter((item) => item.status === 'cold').length
  const active = campaign.CampaignEnrollment.filter((item) => item.status === 'active').length

  return {
    campaignId: campaign.id,
    kind: getCampaignKind(campaign),
    enrollmentCount,
    audienceCount: campaign.type === 'broadcast' ? Math.max(phoneCount, enrollmentCount) : enrollmentCount,
    replies,
    conversions,
    active,
    completed,
    cold,
    status: campaign.status,
  }
}

export async function runCampaignLaunch(id: string, userId: string) {
  const campaign = await getScopedCampaign(id, userId)

  if (!campaign) {
    const error = new Error('Campaign not found')
    ;(error as any).status = 404
    throw error
  }

  const audienceFilter = asObject(campaign.audienceFilter)
  const scheduledAt = audienceFilter.scheduledAt ? new Date(audienceFilter.scheduledAt) : null
  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'scheduled', updatedAt: new Date() },
    })
    return { mode: 'scheduled', kind: getCampaignKind(campaign), campaign: updated }
  }

  if (campaign.type !== 'broadcast') {
    if (!campaign.CampaignStep.length) {
      const error = new Error('Campaign needs at least one step before it can run.')
      ;(error as any).status = 400
      throw error
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'active', updatedAt: new Date() },
      include: {
        Agent: { select: { id: true, name: true } },
        CampaignStep: { orderBy: { stepNumber: 'asc' } },
        CampaignEnrollment: true,
      },
    })

    return {
      mode: 'armed',
      kind: 'campaign',
      campaign: updated,
      note: 'Campaign skeleton armed. Enrollment/step runner is next.',
    }
  }

  const template = typeof audienceFilter.message === 'string' && audienceFilter.message.trim()
    ? audienceFilter.message.trim()
    : campaign.CampaignStep[0]?.message?.trim() || ''
  const phones = normalizePhones(audienceFilter.phones)

  if (!template || phones.length === 0) {
    const error = new Error('Broadcast campaigns need message and phones in audienceFilter.')
    ;(error as any).status = 400
    throw error
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'active', updatedAt: new Date() },
  })

  let sentCount = 0
  let failedCount = 0

  for (const phone of phones) {
    const contact = await ensureContact(campaign.Agent, phone)
    const mergeRequirements = needsMergeData(template)
    const customFields = asObject(contact.customFields)

    if (contact.doNotContact) {
      failedCount += 1
      await upsertEnrollment(campaign.id, contact.id, {
        status: 'cold',
        exitReason: 'manual',
        exitedAt: new Date(),
      }).catch(() => null)
      continue
    }

    if ((mergeRequirements.amount && customFields.amount == null) || (mergeRequirements.date && customFields.dueDate == null)) {
      failedCount += 1
      await upsertEnrollment(campaign.id, contact.id, {
        status: 'cold',
        exitReason: 'manual',
        exitedAt: new Date(),
      }).catch(() => null)
      continue
    }

    const rendered = fillMergeTags(template, campaign.Agent, contact)
    const result = await sendWhatsAppMessage(phone, rendered)

    if (result.success) {
      sentCount += 1
      const conversation = await ensureCustomerConversation(campaign.Agent, contact.id, phone, rendered)
      await prisma.whatsAppMessage.create({
        data: {
          agentId: campaign.agentId,
          phone,
          role: 'assistant',
          content: rendered,
          sessionType: 'customer',
        },
      }).catch(() => null)
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: rendered.slice(0, 200),
          status: 'active',
        },
      }).catch(() => null)
      await upsertEnrollment(campaign.id, contact.id, {
        status: 'completed',
        exitReason: 'goal_met',
        exitedAt: new Date(),
      }).catch(() => null)
    } else {
      failedCount += 1
      await upsertEnrollment(campaign.id, contact.id, {
        status: 'cold',
        exitReason: 'manual',
        exitedAt: new Date(),
      }).catch(() => null)
    }

    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: sentCount > 0 ? 'completed' : 'paused',
      updatedAt: new Date(),
    },
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
  })

  return {
    mode: 'sent',
    kind: 'broadcast',
    campaign: updated,
    sentCount,
    failedCount,
  }
}
