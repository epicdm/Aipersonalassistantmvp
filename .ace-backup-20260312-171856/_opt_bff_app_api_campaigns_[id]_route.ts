import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'

async function findScopedRecord(id: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
  })
  if (campaign) return { kind: 'campaign', record: campaign }

  const broadcast = await prisma.broadcast.findFirst({
    where: { id, userId },
    include: {
      agent: { select: { id: true, name: true } },
      recipients: { orderBy: { phone: 'asc' } },
    },
  })
  if (broadcast) return { kind: 'broadcast', record: broadcast }

  return null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const found = await findScopedRecord(id, user.id)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(found)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const found = await findScopedRecord(id, user.id)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (found.kind === 'campaign') {
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        name: body.name,
        status: body.status,
        type: body.type,
        goal: body.goal,
        audienceFilter: body.audienceFilter,
        updatedAt: new Date(),
      },
      include: { CampaignStep: { orderBy: { stepNumber: 'asc' } }, CampaignEnrollment: true },
    })
    return NextResponse.json({ kind: 'campaign', record: updated })
  }

  const updated = await prisma.broadcast.update({
    where: { id },
    data: {
      name: body.name,
      message: body.message,
      status: body.status,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : body.scheduledAt === null ? null : undefined,
    },
    include: { recipients: true, agent: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ kind: 'broadcast', record: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const found = await findScopedRecord(id, user.id)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (found.kind === 'campaign') {
    await prisma.campaign.delete({ where: { id } })
  } else {
    await prisma.broadcast.delete({ where: { id } })
  }

  return NextResponse.json({ success: true })
}
