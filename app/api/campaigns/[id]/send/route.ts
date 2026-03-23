import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { getUserPlan, runCampaignLaunch } from '@/app/lib/campaigns'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  const plan = getUserPlan(dbUser)
  if (plan === 'free') {
    return NextResponse.json({ error: 'Campaigns and broadcasts require a Pro or Business plan.', upgrade: true }, { status: 403 })
  }

  const { id } = await params

  try {
    const result = await runCampaignLaunch(id, user.id)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to run campaign' }, { status: error.status || 500 })
  }
}
