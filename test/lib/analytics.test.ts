import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma: any = {
  dailyStat: {
    findMany: vi.fn(),
    upsert: vi.fn().mockResolvedValue({}),
  },
  whatsAppMessage: {
    findMany: vi.fn(),
  },
  booking: {
    count: vi.fn(),
  },
  feedback: {
    aggregate: vi.fn(),
  },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

describe('Analytics service', () => {
  let analytics: typeof import('@/app/lib/analytics')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    analytics = await import('@/app/lib/analytics')
  })

  describe('getAnalytics', () => {
    it('aggregates daily stats into summary', async () => {
      mockPrisma.dailyStat.findMany.mockResolvedValue([
        { date: new Date('2026-04-01'), metric: 'messages_sent', value: 50 },
        { date: new Date('2026-04-01'), metric: 'messages_received', value: 45 },
        { date: new Date('2026-04-01'), metric: 'bookings', value: 3 },
        { date: new Date('2026-04-02'), metric: 'messages_sent', value: 30 },
        { date: new Date('2026-04-02'), metric: 'messages_received', value: 28 },
        { date: new Date('2026-04-02'), metric: 'feedback_avg', value: 4.5 },
      ])

      const result = await analytics.getAnalytics('agent-1', new Date('2026-04-01'), new Date('2026-04-02'))

      expect(result.messagesSent).toBe(80)
      expect(result.messagesReceived).toBe(73)
      expect(result.bookingsCount).toBe(3)
      expect(result.feedbackAvgRating).toBe(4.5)
      expect(result.byDay).toHaveLength(2)
    })

    it('handles empty date range', async () => {
      mockPrisma.dailyStat.findMany.mockResolvedValue([])

      const result = await analytics.getAnalytics('agent-1', new Date(), new Date())

      expect(result.messagesSent).toBe(0)
      expect(result.byDay).toEqual([])
    })

    it('tracks per-channel breakdown', async () => {
      mockPrisma.dailyStat.findMany.mockResolvedValue([
        { date: new Date('2026-04-01'), metric: 'messages_sent_whatsapp', value: 30 },
        { date: new Date('2026-04-01'), metric: 'messages_received_whatsapp', value: 25 },
        { date: new Date('2026-04-01'), metric: 'messages_sent_instagram', value: 10 },
        { date: new Date('2026-04-01'), metric: 'messages_received_instagram', value: 8 },
      ])

      const result = await analytics.getAnalytics('agent-1', new Date('2026-04-01'), new Date('2026-04-01'))

      expect(result.byChannel.whatsapp).toEqual({ sent: 30, received: 25 })
      expect(result.byChannel.instagram).toEqual({ sent: 10, received: 8 })
    })
  })

  describe('toCSV', () => {
    it('formats analytics as CSV', () => {
      const csv = analytics.toCSV({
        messagesSent: 80,
        messagesReceived: 73,
        avgResponseTimeMs: 0,
        bookingsCount: 3,
        feedbackAvgRating: 4.5,
        revenue: 150,
        byChannel: {},
        byDay: [
          { date: '2026-04-01', messages: 95, bookings: 3, revenue: 100 },
          { date: '2026-04-02', messages: 58, bookings: 0, revenue: 50 },
        ],
      })

      expect(csv).toContain('Date,Messages,Bookings,Revenue')
      expect(csv).toContain('2026-04-01,95,3,100.00')
      expect(csv).toContain('2026-04-02,58,0,50.00')
    })
  })

  describe('aggregateDailyStats', () => {
    it('computes and upserts daily metrics', async () => {
      mockPrisma.whatsAppMessage.findMany.mockResolvedValue([
        { role: 'user', channel: 'whatsapp' },
        { role: 'assistant', channel: 'whatsapp' },
        { role: 'user', channel: 'instagram' },
        { role: 'assistant', channel: 'instagram' },
      ])
      mockPrisma.booking.count.mockResolvedValue(2)
      mockPrisma.feedback.aggregate.mockResolvedValue({ _avg: { rating: 4.0 } })

      await analytics.aggregateDailyStats('agent-1', new Date('2026-04-01'))

      // Should upsert multiple stats
      expect(mockPrisma.dailyStat.upsert).toHaveBeenCalled()
      const calls = mockPrisma.dailyStat.upsert.mock.calls
      const metrics = calls.map((c: any) => c[0].create.metric)

      expect(metrics).toContain('messages_sent')
      expect(metrics).toContain('messages_received')
      expect(metrics).toContain('bookings')
      expect(metrics).toContain('feedback_avg')
    })
  })
})
