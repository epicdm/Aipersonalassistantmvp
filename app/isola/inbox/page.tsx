import { prisma } from '@/app/lib/prisma'
import { getToken } from '../_token'
import InboxClient from './client'

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  const auth = await getToken(params)
  if (!auth) return <div className="is-full-panel" style={{ alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--is-muted)' }}>🔒 Invalid token</div></div>
  const { token, agentId } = auth

  const conversations = await prisma.conversation.findMany({
    where: { agentId },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    include: { contact: { select: { name: true, phone: true } } },
  })

  const convos = conversations.map(c => ({
    id: c.id,
    phone: c.phone || c.contact?.phone || '',
    contactName: c.contact?.name || c.phone || 'Unknown',
    status: c.status,
    channel: c.channel,
    lastMessagePreview: c.lastMessagePreview || '',
    lastMessageAt: c.lastMessageAt.toISOString(),
    sessionType: c.sessionType,
    escalationFlag: c.escalationFlag,
  }))

  return <InboxClient convos={convos} token={token} agentId={agentId} />
}
