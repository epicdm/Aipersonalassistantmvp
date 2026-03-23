import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { getCampaignKind, getScopedCampaign } from '@/app/lib/campaigns'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const campaign = await getScopedCampaign(id, user.id)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: 'paused', updatedAt: new Date() },
    include: {
      Agent: { select: { id: true, name: true } },
      CampaignStep: { orderBy: { stepNumber: 'asc' } },
      CampaignEnrollment: true,
    },
  })

  return NextResponse.json({ kind: getCampaignKind(updated), campaign: updated })
}
