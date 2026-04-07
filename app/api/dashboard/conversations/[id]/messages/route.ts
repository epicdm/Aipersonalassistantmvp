import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const agentId = await validateDashboardToken(token)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const convo = await prisma.conversation.findFirst({
    where: { id: params.id, agentId },
    include: { contact: { select: { name: true, phone: true } } },
  })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const phone = convo.phone || convo.contact?.phone || ''

  const messages = await prisma.whatsAppMessage.findMany({
    where: { agentId, phone },
    orderBy: { timestamp: 'asc' },
    take: 100,
  })

  return NextResponse.json({
    conversation: {
      id: convo.id,
      phone,
      contactName: convo.contact?.name || phone || 'Unknown',
      status: convo.status,
      channel: convo.channel,
    },
    messages: messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      channel: m.channel,
    })),
  })
}
