import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'

function planLabel(user: any) {
  return user.subscriptionPlan || user.plan || 'free'
}

function estimateMrr(users: any[]) {
  return users.reduce((sum, user) => {
    const plan = planLabel(user)
    if (plan === 'business') return sum + 99
    if (plan === 'pro') return sum + 29
    return sum
  }, 0)
}

function healthStatus(agentStats: { active: number; paused: number; errors: number }, lastActiveAt?: Date | null) {
  if (agentStats.errors > 0) return 'error'
  if (agentStats.active > 0 && lastActiveAt && Date.now() - lastActiveAt.getTime() < 7 * 24 * 60 * 60 * 1000) return 'healthy'
  if (agentStats.paused > 0) return 'paused'
  return 'inactive'
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [users, agentStats, messageStats, escalationStats] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.agent.groupBy({ by: ['userId', 'status'], _count: { _all: true } }),
    prisma.whatsAppMessage.groupBy({
      by: ['agentId'],
      _count: { _all: true },
      where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }).catch(() => []),
    prisma.agentActivity.count({ where: { type: 'escalation', resolved: false } }).catch(() => 0),
  ])

  const agentIdsByUser = new Map<string, string[]>()
  const agents = await prisma.agent.findMany({ select: { id: true, userId: true } })
  for (const agent of agents) {
    const list = agentIdsByUser.get(agent.userId) || []
    list.push(agent.id)
    agentIdsByUser.set(agent.userId, list)
  }

  const messageCountByAgent = new Map(messageStats.map((row: any) => [row.agentId, row._count._all]))
  const groupedAgentStats = new Map<string, { active: number; paused: number; draft: number; error: number }>()
  for (const row of agentStats as any[]) {
    const current = groupedAgentStats.get(row.userId) || { active: 0, paused: 0, draft: 0, error: 0 }
    current[row.status as 'active'] = row._count._all
    groupedAgentStats.set(row.userId, current)
  }

  const tenantRows = await Promise.all(users.map(async (tenant) => {
    const userAgentIds = agentIdsByUser.get(tenant.id) || []
    const [lastMessage, conversationCount] = await Promise.all([
      userAgentIds.length
        ? prisma.whatsAppMessage.findFirst({
            where: { agentId: { in: userAgentIds }, sessionType: 'customer' },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true },
          })
        : Promise.resolve(null),
      prisma.conversation.count({ where: { userId: tenant.id, sessionType: 'customer' } }),
    ])

    const stats = groupedAgentStats.get(tenant.id) || { active: 0, paused: 0, draft: 0, error: 0 }
    const messages24h = userAgentIds.reduce((sum, agentId) => sum + (messageCountByAgent.get(agentId) || 0), 0)

    return {
      userId: tenant.id,
      email: tenant.email,
      plan: planLabel(tenant),
      createdAt: tenant.createdAt,
      lastActiveAt: lastMessage?.timestamp || null,
      agentCount: userAgentIds.length,
      activeAgents: stats.active,
      pausedAgents: stats.paused,
      draftAgents: stats.draft,
      errorAgents: stats.error,
      conversations: conversationCount,
      messages24h,
      health: healthStatus({ active: stats.active, paused: stats.paused, errors: stats.error }, lastMessage?.timestamp || null),
    }
  }))

  const totals = {
    totalTenants: users.length,
    freeTenants: tenantRows.filter((row) => row.plan === 'free').length,
    proTenants: tenantRows.filter((row) => row.plan === 'pro').length,
    businessTenants: tenantRows.filter((row) => row.plan === 'business').length,
    estimatedMrr: estimateMrr(users),
    totalAgents: agents.length,
    activeAgents: tenantRows.reduce((sum, row) => sum + row.activeAgents, 0),
    pausedAgents: tenantRows.reduce((sum, row) => sum + row.pausedAgents, 0),
    totalMessages24h: tenantRows.reduce((sum, row) => sum + row.messages24h, 0),
    openEscalations: escalationStats,
  }

  return NextResponse.json({ totals, tenants: tenantRows })
}
