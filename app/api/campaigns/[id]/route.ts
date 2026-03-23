import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { buildCampaignAudienceFilter, getCampaignKind, getScopedCampaign } from '@/app/lib/campaigns'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const campaign = await getScopedCampaign(id, user.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ kind: getCampaignKind(campaign), record: campaign })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await getScopedCampaign(id, user.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, any> = {
    updatedAt: new Date(),
  }

  if (body.name !== undefined) data.name = body.name
  if (body.status !== undefined) data.status = body.status
  if (body.type !== undefined) data.type = body.type
  if (body.goal !== undefined) data.goal = body.goal
  if (body.audienceFilter !== undefined || body.message !== undefined || body.phones !== undefined || body.scheduledAt !== undefined) {
    data.audienceFilter = buildCampaignAudienceFilter(body, existing.audienceFilter)
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data,
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
  })

  return NextResponse.json({ kind: getCampaignKind(updated), record: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await getScopedCampaign(id, user.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
