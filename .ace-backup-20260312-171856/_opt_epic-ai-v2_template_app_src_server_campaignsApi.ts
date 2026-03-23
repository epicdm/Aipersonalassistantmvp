import type { Request, Response } from 'express'
import { prisma } from 'wasp/server'

const WA_TOKEN = process.env.META_WA_TOKEN || ''
const PHONE_ID = process.env.META_PHONE_ID || '1003873729481088'

function getPlan(user: any): string {
  return user?.subscriptionPlan || user?.plan || 'free'
}

function requireUser(req: Request, res: Response) {
  const user = (req as any).user
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}

function requirePaidPlan(user: any, res: Response) {
  const plan = getPlan(user)
  if (plan === 'free') {
    res.status(403).json({ error: 'Campaigns require Pro or Business.', upgrade: true })
    return null
  }
  return plan
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {}
}

function renderMessage(template: string, agent: any, contact: any) {
  const knowledge = asObject(asObject(agent?.config).knowledge)
  const custom = asObject(contact?.customFields)
  const replacements: Record<string, string> = {
    '{name}': contact?.name || 'there',
    '{business}': knowledge.businessName || agent?.name || 'our business',
    '{amount}': custom.amount != null ? String(custom.amount) : '',
    '{date}': custom.dueDate != null ? String(custom.dueDate) : '',
  }

  return Object.entries(replacements).reduce((acc, [tag, value]) => acc.split(tag).join(value), template)
}

async function sendWhatsAppMessage(phone: string, text: string) {
  if (!WA_TOKEN) return { success: true }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    })

    if (!response.ok) {
      return { success: false, error: await response.text() }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Send failed' }
  }
}

export const campaignsList = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    include: {
      agent: { select: { id: true, name: true } },
      steps: { orderBy: { stepNumber: 'asc' } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json({ campaigns })
}

export const campaignsCreate = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return
  const plan = requirePaidPlan(user, res)
  if (!plan) return

  const body = req.body || {}
  const agentId = body.agentId as string | undefined
  if (!agentId) return res.status(400).json({ error: 'agentId is required' })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  const activeCount = await prisma.campaign.count({
    where: { userId: user.id, status: { in: ['draft', 'active', 'scheduled'] } },
  })
  if (plan === 'pro' && activeCount >= 3) {
    return res.status(403).json({ error: 'Pro plan allows up to 3 active campaigns.', upgrade: true })
  }

  const steps = Array.isArray(body.steps) ? body.steps : []
  const type = body.type || 'sales'
  const audienceFilter = {
    ...(asObject(body.audienceFilter)),
    message: body.message || asObject(body.audienceFilter).message || '',
    phones: Array.isArray(body.phones) ? body.phones : asObject(body.audienceFilter).phones || [],
    scheduledAt: body.scheduledAt || asObject(body.audienceFilter).scheduledAt || null,
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      agentId,
      name: body.name || `${agent.name} campaign`,
      type,
      status: body.scheduledAt ? 'scheduled' : (body.status || 'draft'),
      audienceFilter,
      goal: body.goal || (type === 'broadcast' ? 'reply' : 'booking'),
      steps: {
        create: steps
          .map((step: any, index: number) => ({
            stepNumber: Number(step.stepNumber || index + 1),
            delayDays: Number(step.delayDays || 0),
            message: String(step.message || '').trim(),
            onReply: step.onReply || 'agent_takeover',
            onNoReply: step.onNoReply || 'next_step',
          }))
          .filter((step: any) => step.message),
      },
    },
    include: { steps: { orderBy: { stepNumber: 'asc' } }, agent: { select: { id: true, name: true } } },
  })

  return res.status(201).json({ campaign })
}

export const campaignsDetail = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return

  const { id } = req.params as { id: string }
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    include: {
      agent: { select: { id: true, name: true, config: true } },
      steps: { orderBy: { stepNumber: 'asc' } },
      enrollments: { orderBy: { enrolledAt: 'desc' } },
    },
  })

  if (!campaign) return res.status(404).json({ error: 'Not found' })
  return res.json({ campaign })
}

export const campaignsUpdate = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return

  const { id } = req.params as { id: string }
  const existing = await prisma.campaign.findFirst({ where: { id, userId: user.id } })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const body = req.body || {}
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      status: body.status,
      goal: body.goal,
      audienceFilter: body.audienceFilter,
    },
    include: { steps: { orderBy: { stepNumber: 'asc' } }, agent: { select: { id: true, name: true } } },
  })

  return res.json({ campaign: updated })
}

export const campaignsDelete = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return

  const { id } = req.params as { id: string }
  await prisma.campaign.deleteMany({ where: { id, userId: user.id } })
  return res.json({ success: true })
}

export const campaignsLaunch = async (req: Request, res: Response, _context: any) => {
  return campaignsSend(req, res, _context)
}

export const campaignsPause = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return

  const { id } = req.params as { id: string }
  const campaign = await prisma.campaign.findFirst({ where: { id, userId: user.id } })
  if (!campaign) return res.status(404).json({ error: 'Not found' })

  const updated = await prisma.campaign.update({ where: { id }, data: { status: 'paused' } })
  return res.json({ campaign: updated })
}

export const campaignsSend = async (req: Request, res: Response, _context: any) => {
  const user = requireUser(req, res)
  if (!user) return
  const plan = requirePaidPlan(user, res)
  if (!plan) return

  const { id } = req.params as { id: string }
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    include: {
      agent: true,
      steps: { orderBy: { stepNumber: 'asc' } },
      enrollments: true,
    },
  })

  if (!campaign) return res.status(404).json({ error: 'Not found' })

  const audienceFilter = asObject(campaign.audienceFilter)
  const scheduledAt = audienceFilter.scheduledAt ? new Date(audienceFilter.scheduledAt) : null
  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    const updated = await prisma.campaign.update({ where: { id }, data: { status: 'scheduled' } })
    return res.json({ mode: 'scheduled', campaign: updated })
  }

  if (campaign.type !== 'broadcast') {
    const updated = await prisma.campaign.update({ where: { id }, data: { status: 'active' } })
    return res.json({ mode: 'armed', campaign: updated, note: 'Campaign skeleton armed. Enrollment runner is next.' })
  }

  const template = typeof audienceFilter.message === 'string' ? audienceFilter.message : campaign.steps[0]?.message || ''
  const phones = Array.isArray(audienceFilter.phones) ? audienceFilter.phones.map((phone: any) => String(phone || '').trim()).filter(Boolean) : []
  if (!template || phones.length === 0) {
    return res.status(400).json({ error: 'Broadcast campaigns need message and phones in audienceFilter.' })
  }

  let sent = 0
  let failed = 0

  for (const phone of phones) {
    const contact = await prisma.contact.findFirst({ where: { userId: user.id, phone } })
    const rendered = renderMessage(template, campaign.agent, contact)
    const result = await sendWhatsAppMessage(phone, rendered)

    if (contact) {
      const existingEnrollment = await prisma.campaignEnrollment.findFirst({
        where: { campaignId: campaign.id, contactId: contact.id },
      })

      if (existingEnrollment) {
        await prisma.campaignEnrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: result.success ? 'completed' : 'cold',
            exitReason: result.success ? 'goal_met' : 'manual',
            exitedAt: new Date(),
          },
        }).catch(() => null)
      } else {
        await prisma.campaignEnrollment.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            status: result.success ? 'completed' : 'cold',
            exitReason: result.success ? 'goal_met' : 'manual',
            exitedAt: new Date(),
          },
        }).catch(() => null)
      }
    }

    if (result.success) sent += 1
    else failed += 1

    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: sent > 0 ? 'completed' : 'paused' },
    include: { steps: { orderBy: { stepNumber: 'asc' } } },
  })

  return res.json({ mode: 'sent', campaign: updated, sent, failed })
}
