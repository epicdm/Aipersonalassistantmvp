import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { getUserPlan, runBroadcastSkeleton } from '@/app/lib/campaigns'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  const plan = getUserPlan(dbUser)
  if (plan === 'free') {
    return NextResponse.json({ error: 'Campaigns and broadcasts require a Pro or Business plan.', upgrade: true }, { status: 403 })
  }

  const { id } = await params

  const broadcast = await prisma.broadcast.findFirst({ where: { id, userId: user.id } })
  if (broadcast) {
    try {
      const result = await runBroadcastSkeleton(id, user.id)
      return NextResponse.json({ kind: 'broadcast', ...result })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to run broadcast' }, { status: error.status || 500 })
    }
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    include: { CampaignStep: { orderBy: { stepNumber: 'asc' } } },
  })

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!campaign.CampaignStep.length) {
    return NextResponse.json({ error: 'Campaign needs at least one step before it can run.' }, { status: 400 })
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status: campaign.status === 'scheduled' ? 'scheduled' : 'active',
      updatedAt: new Date(),
    },
    include: { CampaignStep: { orderBy: { stepNumber: 'asc' } }, CampaignEnrollment: true },
  })

  return NextResponse.json({
    kind: 'campaign',
    mode: 'armed',
    campaign: updated,
    note: 'Campaign skeleton armed. Enrollment/step runner is next.',
  })
}
