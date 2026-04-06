import { prisma } from '@/app/lib/prisma'
import { getToken } from '../_token'
import HomeClient from './client'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  const auth = await getToken(params)

  if (!auth) {
    return (
      <>
        <div className="is-full-panel" style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontSize: 14, color: 'var(--is-muted)' }}>Invalid or expired token</div>
        </div>
      </>
    )
  }

  const { token, agentId } = auth
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [agent, totalConvos, todayConvos, pendingCount, contactCount, callCount, todayCallCount, recentConvos] =
    await Promise.all([
      prisma.agent.findUnique({ where: { id: agentId }, select: { name: true, status: true } }),
      prisma.conversation.count({ where: { agentId } }),
      prisma.conversation.count({ where: { agentId, createdAt: { gte: today } } }),
      prisma.conversation.count({ where: { agentId, status: 'pending' } }),
      prisma.agentContact.count({ where: { agentId } }),
      prisma.callLog.count({ where: { agentId } }),
      prisma.callLog.count({ where: { agentId, createdAt: { gte: today } } }),
      prisma.conversation.findMany({
        where: { agentId },
        orderBy: { lastMessageAt: 'desc' },
        take: 30,
        include: { contact: { select: { name: true, phone: true } } },
      }),
    ])

  const convos = recentConvos.map(c => ({
    id: c.id,
    contactName: c.contact?.name || c.phone || 'Unknown',
    contactPhone: c.phone || c.contact?.phone || '',
    lastMessage: c.lastMessagePreview || '',
    lastMessageAt: c.lastMessageAt.toISOString(),
    status: c.status,
    unread: c.escalationFlag ? 1 : 0,
  }))

  const stats = { totalConvos, todayConvos, pendingCount, contactCount, callCount, todayCallCount }

  return (
    <HomeClient
      agent={{ name: agent?.name ?? 'Aria', status: agent?.status ?? 'active' }}
      stats={stats}
      convos={convos}
      token={token}
    />
  )
}
