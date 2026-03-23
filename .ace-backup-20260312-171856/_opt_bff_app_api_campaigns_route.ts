import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { ensureCampaignAccess, getUserPlan, makeId } from '@/app/lib/campaigns'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [campaigns, broadcasts] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId: user.id },
      include: {
        Agent: { select: { id: true, name: true } },
        CampaignStep: { orderBy: { stepNumber: 'asc' } },
        _count: { select: { CampaignEnrollment: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.broadcast.findMany({
      where: { userId: user.id },
      include: {
        agent: { select: { id: true, name: true } },
        recipients: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ campaigns, broadcasts })
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
  const kind = body.kind === 'campaign' ? 'campaign' : 'broadcast'
  const agentId = body.agentId as string
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  if (kind === 'campaign') {
    const activeCampaignCount = await prisma.campaign.count({
      where: { userId: user.id, status: { in: ['draft', 'active', 'scheduled'] } },
    })

    if (plan === 'pro' && activeCampaignCount >= 3) {
      return NextResponse.json({ error: 'Pro plan allows up to 3 active campaigns.', upgrade: true }, { status: 403 })
    }

    const steps = Array.isArray(body.steps) ? body.steps : []
    const campaign = await prisma.campaign.create({
      data: {
        id: makeId(),
        userId: user.id,
        agentId,
        name: body.name || `${agent.name} campaign`,
        type: body.type || 'sales',
        status: body.scheduledAt ? 'scheduled' : (body.status || 'draft'),
        audienceFilter: body.audienceFilter || {},
        goal: body.goal || 'reply',
        updatedAt: new Date(),
        CampaignStep: {
          create: steps.map((step: any, index: number) => ({
            id: makeId(),
            stepNumber: Number(step.stepNumber || index + 1),
            delayDays: Number(step.delayDays || 0),
            message: String(step.message || '').trim(),
            onReply: step.onReply || 'agent_takeover',
            onNoReply: step.onNoReply || 'next_step',
          })).filter((step: any) => step.message),
        },
      },
      include: { CampaignStep: { orderBy: { stepNumber: 'asc' } } },
    })

    return NextResponse.json({ kind, campaign }, { status: 201 })
  }

  const rawPhones = Array.isArray(body.phones) ? body.phones : []
  const cleanPhones = [...new Set(rawPhones.map((phone: string) => String(phone || '').trim()).filter(Boolean))]
  const maxRecipients = plan === 'pro' ? 500 : Number.MAX_SAFE_INTEGER

  if (cleanPhones.length > maxRecipients) {
    return NextResponse.json({ error: 'Pro plan allows up to 500 recipients per broadcast.', upgrade: true }, { status: 403 })
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      userId: user.id,
      agentId,
      name: body.name || `${agent.name} broadcast`,
      message: String(body.message || '').trim(),
      status: body.scheduledAt ? 'scheduled' : 'draft',
      recipientCount: cleanPhones.length,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      recipients: {
        create: cleanPhones.map((phone) => ({ phone, status: 'pending' })),
      },
    },
    include: { recipients: true, agent: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ kind, broadcast }, { status: 201 })
}
