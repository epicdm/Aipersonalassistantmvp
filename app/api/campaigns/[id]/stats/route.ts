import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { getCampaignStats } from '@/app/lib/campaigns'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const stats = await getCampaignStats(id, user.id)
    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load campaign stats' }, { status: error.status || 500 })
  }
}
