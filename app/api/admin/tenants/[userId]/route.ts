import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params
  const tenant = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agents: {
        include: {
          conversations: { where: { sessionType: 'customer' }, take: 5, orderBy: { lastMessageAt: 'desc' } },
          Campaign: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      contacts: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const agentIds = tenant.agents.map((agent) => agent.id)
  const [messages24h, escalations] = await Promise.all([
    agentIds.length
      ? prisma.whatsAppMessage.count({
          where: {
            agentId: { in: agentIds },
            sessionType: 'customer',
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        })
      : Promise.resolve(0),
    agentIds.length
      ? prisma.agentActivity.count({
          where: {
            agentId: { in: agentIds },
            type: 'escalation',
            resolved: false,
          },
        }).catch(() => 0)
      : Promise.resolve(0),
  ])

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      email: tenant.email,
      plan: tenant.subscriptionPlan || tenant.plan || 'free',
      createdAt: tenant.createdAt,
      messages24h,
      escalations,
      contacts: tenant.contacts.length,
      agents: tenant.agents,
    },
  })
}
