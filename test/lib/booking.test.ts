import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma: any = {
  service: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  businessHours: {
    findMany: vi.fn(),
  },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

describe('Booking service', () => {
  let booking: typeof import('@/app/lib/booking')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    booking = await import('@/app/lib/booking')
  })

  describe('getAvailableSlots', () => {
    it('returns empty when service not found', async () => {
      mockPrisma.service.findUnique.mockResolvedValue(null)
      const slots = await booking.getAvailableSlots('agent-1', 'svc-bad')
      expect(slots).toEqual([])
    })

    it('returns empty when no business hours configured', async () => {
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'svc-1', duration: 30 })
      mockPrisma.businessHours.findMany.mockResolvedValue([])

      const slots = await booking.getAvailableSlots('agent-1', 'svc-1')
      expect(slots).toEqual([])
    })

    it('generates slots within business hours', async () => {
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'svc-1', duration: 30 })

      // Open Monday-Friday 9:00-17:00
      const hours = [1, 2, 3, 4, 5].map(day => ({
        agentId: 'agent-1',
        dayOfWeek: day,
        openTime: '09:00',
        closeTime: '17:00',
      }))
      mockPrisma.businessHours.findMany.mockResolvedValue(hours)
      mockPrisma.booking.findMany.mockResolvedValue([]) // No existing bookings

      const slots = await booking.getAvailableSlots('agent-1', 'svc-1', 3)

      // Should have some slots (exact count depends on current time/day)
      expect(slots.length).toBeGreaterThan(0)
      expect(slots.length).toBeLessThanOrEqual(20) // Max 20

      // Each slot should have required fields
      for (const slot of slots) {
        expect(slot.id).toBeTruthy()
        expect(slot.datetime).toBeInstanceOf(Date)
        expect(slot.label).toBeTruthy()
      }
    })

    it('excludes slots that conflict with existing bookings', async () => {
      mockPrisma.service.findUnique.mockResolvedValue({ id: 'svc-1', duration: 60 })

      // Tomorrow only, 10:00-12:00
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayOfWeek = tomorrow.getDay()

      mockPrisma.businessHours.findMany.mockResolvedValue([{
        agentId: 'agent-1', dayOfWeek, openTime: '10:00', closeTime: '12:00',
      }])

      // Existing booking at 10:00 for 60 min
      const bookingTime = new Date(tomorrow)
      bookingTime.setHours(10, 0, 0, 0)
      mockPrisma.booking.findMany.mockResolvedValue([{
        datetime: bookingTime,
        service: { duration: 60 },
      }])

      const slots = await booking.getAvailableSlots('agent-1', 'svc-1', 2)

      // 10:00 and 10:30 should be blocked (60-min service overlaps)
      // Only 11:00 should be available
      const slotTimes = slots.map(s => s.datetime.getHours() * 60 + s.datetime.getMinutes())
      expect(slotTimes).not.toContain(600) // 10:00
      expect(slotTimes).not.toContain(630) // 10:30
    })
  })

  describe('createBooking', () => {
    it('creates a booking record', async () => {
      const data = {
        agentId: 'agent-1',
        serviceId: 'svc-1',
        contactId: 'contact-1',
        datetime: new Date('2026-04-10T14:00:00Z'),
      }
      mockPrisma.booking.create.mockResolvedValue({ id: 'book-1', ...data, status: 'confirmed' })

      const result = await booking.createBooking(data)
      expect(result.id).toBe('book-1')
      expect(result.status).toBe('confirmed')
    })
  })

  describe('getServices', () => {
    it('returns services for an agent', async () => {
      mockPrisma.service.findMany.mockResolvedValue([
        { id: 'svc-1', name: 'Haircut', duration: 30, price: 20 },
        { id: 'svc-2', name: 'Color', duration: 90, price: 60 },
      ])

      const services = await booking.getServices('agent-1')
      expect(services).toHaveLength(2)
    })
  })
})
