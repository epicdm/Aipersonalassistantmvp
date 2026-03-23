import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import {
  buildCampaignAudienceFilter,
  ensureCampaignAccess,
  getUserPlan,
  makeId,
  normalizePhones,
} from '@/app/lib/campaigns'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const records = await prisma.campaign.findMany({
    where: { userId: user.id },
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const campaigns = records.filter((item) => item.type !== 'broadcast')
  const broadcasts = records.filter((item) => item.type === 'broadcast')

  return NextResponse.json({ campaigns, broadcasts, all: records })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  const plan = getUserPlan(dbUser)

  try {
    ensureCampaignAccess(plan)
  } catch (error: any) {
    return NextResponse.json({ error: error.message, upgrade: true }, { status: error.status || 403 })
  }

  const body = await req.json()
  const requestedType = String(body.type || '').trim().toLowerCase()
  const kind = body.kind === 'broadcast' || requestedType === 'broadcast' ? 'broadcast' : 'campaign'
  const type = kind === 'broadcast' ? 'broadcast' : (requestedType || 'sales')
  const agentId = String(body.agentId || '').trim()

  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const audienceFilter = buildCampaignAudienceFilter(body)
  const cleanPhones = normalizePhones(audienceFilter.phones)

  if (kind === 'broadcast') {
    const maxRecipients = plan === 'pro' ? 500 : Number.MAX_SAFE_INTEGER
    if (cleanPhones.length > maxRecipients) {
      return NextResponse.json({ error: 'Pro plan allows up to 500 recipients per broadcast.', upgrade: true }, { status: 403 })
    }
  } else {
    const activeCampaignCount = await prisma.campaign.count({
      where: {
        userId: user.id,
        type: { not: 'broadcast' },
        status: { in: ['draft', 'active', 'scheduled'] },
      },
    })

    if (plan === 'pro' && activeCampaignCount >= 3) {
      return NextResponse.json({ error: 'Pro plan allows up to 3 active campaigns.', upgrade: true }, { status: 403 })
    }
  }

  const requestedSteps = Array.isArray(body.steps) ? body.steps : []
  const stepSource = requestedSteps.length > 0
    ? requestedSteps
    : kind === 'broadcast' && typeof body.message === 'string' && body.message.trim()
      ? [{ stepNumber: 1, delayDays: 0, message: body.message, onReply: 'agent_takeover', onNoReply: 'end' }]
      : []

  const campaign = await prisma.campaign.create({
    data: {
      id: makeId(),
      userId: user.id,
      agentId,
      name: body.name || `${agent.name} ${kind === 'broadcast' ? 'broadcast' : 'campaign'}`,
      type,
      status: audienceFilter.scheduledAt ? 'scheduled' : (body.status || 'draft'),
      audienceFilter,
      goal: body.goal || 'reply',
      updatedAt: new Date(),
      CampaignStep: {
        create: stepSource
          .map((step: any, index: number) => ({
            id: makeId(),
            stepNumber: Number(step.stepNumber || index + 1),
            delayDays: Number(step.delayDays || 0),
            message: String(step.message || '').trim(),
            onReply: step.onReply || 'agent_takeover',
            onNoReply: step.onNoReply || 'next_step',
          }))
          .filter((step: any) => step.message),
      },
    },
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
  })

  if (kind === 'broadcast') {
    return NextResponse.json({ kind, broadcast: campaign, campaign }, { status: 201 })
  }

  return NextResponse.json({ kind, campaign }, { status: 201 })
}
