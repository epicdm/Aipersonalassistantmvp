import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const agentId = await validateDashboardToken(token)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || 'all'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

  const where: Record<string, unknown> = { agentId }
  if (status !== 'all') where.status = status

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: limit,
    include: { contact: { select: { name: true, phone: true } } },
  })

  const result = conversations.map(c => ({
    id: c.id,
    phone: c.phone || c.contact?.phone || '',
    contactName: c.contact?.name || c.phone || 'Unknown',
    status: c.status,
    channel: c.channel,
    lastMessagePreview: c.lastMessagePreview || '',
    lastMessageAt: c.lastMessageAt,
    sessionType: c.sessionType,
    escalationFlag: c.escalationFlag,
  }))

  return NextResponse.json({ conversations: result })
}
