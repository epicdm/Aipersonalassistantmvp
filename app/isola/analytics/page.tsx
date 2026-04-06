import { prisma } from '@/app/lib/prisma'
import { getToken } from '../_token'
import AnalyticsClient from './client'

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  const auth = await getToken(params)
  if (!auth) return <div className="is-full-panel" style={{ alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--is-muted)' }}>🔒 Invalid token</div></div>
  const { agentId } = auth

  const now = new Date()
  const days: Array<{ label: string; v: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(d.getDate() + 1)
    const count = await prisma.conversation.count({ where: { agentId, createdAt: { gte: d, lt: next } } })
    days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), v: count })
  }

  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [convos, messages, contacts, contactsNew, calls] = await Promise.all([
    prisma.conversation.count({ where: { agentId } }),
    prisma.whatsAppMessage.count({ where: { agentId } }),
    prisma.agentContact.count({ where: { agentId } }),
    prisma.agentContact.count({ where: { agentId, firstContactAt: { gte: thisMonth } } }),
    prisma.callLog.count({ where: { agentId } }),
  ])

  const data = {
    convos, convosDelta: 'all time',
    messages, messagesDelta: 'sent & received',
    contacts, contactsDelta: `+${contactsNew} this month`,
    calls, callsDelta: '',
    avgResponse: '< 1s', avgResponseDelta: 'AI-powered',
    dailyConvos: days,
    sources: [{ label: 'WhatsApp', pct: 85 }, { label: 'Voice', pct: 10 }, { label: 'Web', pct: 5 }],
    topProducts: [] as Array<{ name: string; mentions: number }>,
  }

  return <AnalyticsClient data={data} />
}
