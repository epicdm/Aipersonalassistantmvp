/**
 * Dashboard App — Home / Activity Feed
 * GET  ?token=...  — stats, recent activity, agent status, tip
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [agent, totalConvos, todayConvos, pendingCount, contactCount, callCount, recentConvos, recentActivity] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentId }, select: { name: true, status: true } }),
      prisma.conversation.count({ where: { agentId } }),
      prisma.conversation.count({ where: { agentId, createdAt: { gte: today } } }),
      prisma.conversation.count({ where: { agentId, status: 'pending' } }),
      prisma.agentContact.count({ where: { agentId } }),
      prisma.callLog.count({ where: { agentId } }),
      prisma.conversation.findMany({
        where: { agentId },
        orderBy: { lastMessageAt: 'desc' },
        take: 12,
        include: { contact: { select: { name: true, phone: true } } },
      }),
      prisma.agentActivity.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ])

    // Build activity feed from recent conversations + activities
    const convoFeed = recentConvos.map(c => ({
      label:  c.contact?.name || c.contact?.phone || c.phone || 'Unknown',
      detail: c.sessionType === 'voice' ? `Voice · ${c.status}` : `${c.channel} · ${c.status}`,
      time:   timeAgo(c.lastMessageAt),
      unread: c.status === 'pending' ? 1 : 0,
      icon:   c.sessionType === 'voice' ? '🎙' : null,
    }))

    const actFeed = recentActivity.map(a => ({
      label:  a.type.replace(/_/g, ' '),
      detail: a.summary,
      time:   timeAgo(a.createdAt),
      unread: 0,
      icon:   null,
    }))

    const activity = [...convoFeed, ...actFeed].slice(0, 12)

    const tips = [
      `Send a broadcast to re-engage contacts who haven't heard from you in 7 days.`,
      `You have ${pendingCount} conversations waiting for a reply.`,
      `Update your catalog with latest prices to help your agent quote accurately.`,
      `${totalConvos} total conversations handled — keep it up!`,
    ]
    const tip = tips[Math.floor(Date.now() / 86400000) % tips.length]

    return NextResponse.json({
      stats: {
        convos:         todayConvos,
        convosDelta:    `${totalConvos} total`,
        contacts:       contactCount,
        contactsDelta:  'total contacts',
        calls:          callCount,
        callsDelta:     'total calls',
        attention:      pendingCount,
        attentionDelta: pendingCount > 0 ? 'require reply' : 'all handled ✓',
      },
      agent: {
        name:        agent?.name || 'Aria',
        active:      agent?.status !== 'paused',
        lastMessage: activity[0]?.time || null,
      },
      activity,
      tip,
    })
  } catch (err) {
    console.error('[dashboard/home GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function timeAgo(date: Date | null | string): string {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
