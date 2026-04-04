/**
 * Booking service — handles appointment scheduling with in-app availability.
 * Uses BusinessHours + existing Bookings to calculate available slots.
 */

import { prisma } from '@/app/lib/prisma'

// ─── Availability ─────────────────────────────────────────────────────────────

/**
 * Get available time slots for a service on upcoming days.
 * Checks business hours and existing bookings for conflicts.
 */
export async function getAvailableSlots(
  agentId: string,
  serviceId: string,
  daysAhead = 7
): Promise<{ id: string; datetime: Date; label: string }[]> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) return []

  const businessHours = await prisma.businessHours.findMany({
    where: { agentId },
    orderBy: { dayOfWeek: 'asc' },
  })
  if (!businessHours.length) return []

  const now = new Date()
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  // Get existing bookings in the date range
  const existingBookings = await prisma.booking.findMany({
    where: {
      agentId,
      serviceId,
      datetime: { gte: now, lte: endDate },
      status: { in: ['confirmed'] },
    },
    select: { datetime: true, service: { select: { duration: true } } },
  })

  const slots: { id: string; datetime: Date; label: string }[] = []
  const slotDuration = service.duration // minutes

  // For each day in the range
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    date.setHours(0, 0, 0, 0)

    const dayOfWeek = date.getDay()
    const hours = businessHours.find(h => h.dayOfWeek === dayOfWeek)
    if (!hours) continue // Closed on this day

    const [openH, openM] = hours.openTime.split(':').map(Number)
    const [closeH, closeM] = hours.closeTime.split(':').map(Number)

    // Generate slots at 30-min intervals within business hours
    const startMinutes = openH * 60 + openM
    const endMinutes = closeH * 60 + closeM

    for (let m = startMinutes; m + slotDuration <= endMinutes; m += 30) {
      const slotDate = new Date(date)
      slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0)

      // Skip if in the past
      if (slotDate.getTime() < now.getTime()) continue

      // Check for conflicts
      const slotEnd = new Date(slotDate.getTime() + slotDuration * 60 * 1000)
      const hasConflict = existingBookings.some(b => {
        const bookingEnd = new Date(b.datetime.getTime() + b.service.duration * 60 * 1000)
        return slotDate < bookingEnd && slotEnd > b.datetime
      })

      if (!hasConflict) {
        const label = formatSlotLabel(slotDate)
        slots.push({
          id: `slot_${slotDate.getTime()}`,
          datetime: slotDate,
          label,
        })
      }
    }
  }

  return slots.slice(0, 20) // Max 20 slots for the Flow UI
}

function formatSlotLabel(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateObj = new Date(date)
  dateObj.setHours(0, 0, 0, 0)

  let dayLabel: string
  if (dateObj.getTime() === today.getTime()) {
    dayLabel = 'Today'
  } else if (dateObj.getTime() === tomorrow.getTime()) {
    dayLabel = 'Tomorrow'
  } else {
    dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${dayLabel} ${timeLabel}`
}

// ─── Booking CRUD ─────────────────────────────────────────────────────────────

export async function createBooking(data: {
  agentId: string
  serviceId: string
  contactId: string
  datetime: Date
  notes?: string
}) {
  return prisma.booking.create({ data })
}

export async function getBookings(agentId: string, from?: Date, to?: Date) {
  return prisma.booking.findMany({
    where: {
      agentId,
      ...(from || to ? {
        datetime: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      } : {}),
    },
    include: {
      service: true,
      contact: true,
    },
    orderBy: { datetime: 'asc' },
  })
}

export async function updateBookingStatus(id: string, status: string) {
  return prisma.booking.update({ where: { id }, data: { status } })
}

// ─── Services CRUD ────────────────────────────────────────────────────────────

export async function getServices(agentId: string) {
  return prisma.service.findMany({ where: { agentId }, orderBy: { name: 'asc' } })
}

export async function createService(data: {
  agentId: string
  name: string
  duration: number
  price: number
}) {
  return prisma.service.create({ data })
}
