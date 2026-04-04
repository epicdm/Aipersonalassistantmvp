/**
 * Analytics service — pre-computed daily stats + real-time aggregations.
 * DailyStat model stores pre-computed metrics via midnight cron.
 * Real-time queries supplement for "today" data.
 */

import { prisma } from '@/app/lib/prisma'

// ─── Pre-computed stats query ─────────────────────────────────────────────────

export interface AnalyticsSummary {
  messagesSent: number
  messagesReceived: number
  avgResponseTimeMs: number
  bookingsCount: number
  feedbackAvgRating: number
  revenue: number
  byChannel: Record<string, { sent: number; received: number }>
  byDay: { date: string; messages: number; bookings: number; revenue: number }[]
}

export async function getAnalytics(
  agentId: string,
  from: Date,
  to: Date
): Promise<AnalyticsSummary> {
  const stats = await prisma.dailyStat.findMany({
    where: {
      agentId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: 'asc' },
  })

  // Aggregate from daily stats
  let messagesSent = 0
  let messagesReceived = 0
  let bookingsCount = 0
  let feedbackTotal = 0
  let feedbackCount = 0
  let revenue = 0

  const byDay: AnalyticsSummary['byDay'] = []
  const byChannel: Record<string, { sent: number; received: number }> = {}

  // Group by date
  const dateMap = new Map<string, { messages: number; bookings: number; revenue: number }>()

  for (const stat of stats) {
    const dateKey = stat.date.toISOString().split('T')[0]
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { messages: 0, bookings: 0, revenue: 0 })
    }
    const day = dateMap.get(dateKey)!

    switch (stat.metric) {
      case 'messages_sent':
        messagesSent += stat.value
        day.messages += stat.value
        break
      case 'messages_received':
        messagesReceived += stat.value
        day.messages += stat.value
        break
      case 'bookings':
        bookingsCount += stat.value
        day.bookings += stat.value
        break
      case 'revenue':
        revenue += stat.value
        day.revenue += stat.value
        break
      case 'feedback_avg':
        feedbackTotal += stat.value
        feedbackCount++
        break
      default:
        // Channel-specific metrics: messages_sent_instagram, etc.
        if (stat.metric.startsWith('messages_sent_')) {
          const channel = stat.metric.replace('messages_sent_', '')
          if (!byChannel[channel]) byChannel[channel] = { sent: 0, received: 0 }
          byChannel[channel].sent += stat.value
        } else if (stat.metric.startsWith('messages_received_')) {
          const channel = stat.metric.replace('messages_received_', '')
          if (!byChannel[channel]) byChannel[channel] = { sent: 0, received: 0 }
          byChannel[channel].received += stat.value
        }
    }
  }

  for (const [date, data] of dateMap) {
    byDay.push({ date, ...data })
  }

  return {
    messagesSent,
    messagesReceived,
    avgResponseTimeMs: 0, // Computed from real-time data if needed
    bookingsCount,
    feedbackAvgRating: feedbackCount > 0 ? feedbackTotal / feedbackCount : 0,
    revenue,
    byChannel,
    byDay,
  }
}

// ─── Midnight aggregation cron ────────────────────────────────────────────────

export async function aggregateDailyStats(agentId: string, date: Date): Promise<void> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Count messages sent/received
  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      agentId,
      timestamp: { gte: startOfDay, lte: endOfDay },
    },
    select: { role: true, channel: true },
  })

  const sent = messages.filter(m => m.role === 'assistant').length
  const received = messages.filter(m => m.role === 'user').length

  // Channel breakdown
  const channelCounts: Record<string, { sent: number; received: number }> = {}
  for (const m of messages) {
    const ch = m.channel || 'whatsapp'
    if (!channelCounts[ch]) channelCounts[ch] = { sent: 0, received: 0 }
    if (m.role === 'assistant') channelCounts[ch].sent++
    else channelCounts[ch].received++
  }

  // Bookings count
  const bookings = await prisma.booking.count({
    where: { agentId, createdAt: { gte: startOfDay, lte: endOfDay } },
  })

  // Feedback average
  const feedback = await prisma.feedback.aggregate({
    where: { agentId, createdAt: { gte: startOfDay, lte: endOfDay } },
    _avg: { rating: true },
  })

  // Upsert stats
  const statsToWrite = [
    { metric: 'messages_sent', value: sent },
    { metric: 'messages_received', value: received },
    { metric: 'bookings', value: bookings },
    ...(feedback._avg.rating ? [{ metric: 'feedback_avg', value: feedback._avg.rating }] : []),
    ...Object.entries(channelCounts).flatMap(([ch, counts]) => [
      { metric: `messages_sent_${ch}`, value: counts.sent },
      { metric: `messages_received_${ch}`, value: counts.received },
    ]),
  ]

  for (const stat of statsToWrite) {
    await prisma.dailyStat.upsert({
      where: {
        agentId_date_metric: { agentId, date: startOfDay, metric: stat.metric },
      },
      create: { agentId, date: startOfDay, metric: stat.metric, value: stat.value },
      update: { value: stat.value },
    })
  }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function toCSV(analytics: AnalyticsSummary): string {
  const rows = [
    ['Date', 'Messages', 'Bookings', 'Revenue'].join(','),
    ...analytics.byDay.map(d =>
      [d.date, d.messages, d.bookings, d.revenue.toFixed(2)].join(',')
    ),
  ]
  return rows.join('\n')
}
