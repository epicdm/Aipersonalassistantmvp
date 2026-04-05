import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma: any = {
  contact: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  agentContact: {
    findFirst: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('crypto', () => ({ default: { randomUUID: () => 'test-uuid' } }))

describe('contacts.findOrCreateContact', () => {
  let contacts: typeof import('@/app/lib/contacts')
  const agent = { id: 'agent-1', userId: 'user-1' }

  beforeEach(async () => {
    vi.clearAllMocks()
    contacts = await import('@/app/lib/contacts')
  })

  it('returns existing contact without creating', async () => {
    const existing = { id: 'contact-1', phone: '17671234567', userId: 'user-1' }
    mockPrisma.contact.findFirst.mockResolvedValue(existing)
    mockPrisma.agentContact.findFirst.mockResolvedValue({ id: 'ac-1' })

    const result = await contacts.findOrCreateContact(agent, '17671234567')

    expect(result).toEqual(existing)
    expect(mockPrisma.contact.create).not.toHaveBeenCalled()
    expect(mockPrisma.agentContact.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ac-1' } })
    )
  })

  it('creates contact when not found', async () => {
    const created = { id: 'contact-2', phone: '17671234567', userId: 'user-1' }
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    mockPrisma.contact.create.mockResolvedValue(created)
    mockPrisma.agentContact.findFirst.mockResolvedValue(null)
    mockPrisma.agentContact.create.mockResolvedValue({ id: 'ac-2' })

    const result = await contacts.findOrCreateContact(agent, '17671234567', 'John')

    expect(mockPrisma.contact.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        primaryAgentId: 'agent-1',
        name: 'John',
        phone: '17671234567',
      },
    })
    expect(result).toEqual(created)
  })

  it('uses phone as fallback name when no name given', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    mockPrisma.contact.create.mockResolvedValue({ id: 'c3', phone: '17671234567' })
    mockPrisma.agentContact.findFirst.mockResolvedValue(null)
    mockPrisma.agentContact.create.mockResolvedValue({})

    await contacts.findOrCreateContact(agent, '17671234567')

    expect(mockPrisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: '17671234567' }) })
    )
  })

  it('creates AgentContact junction when missing', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({ id: 'contact-1', phone: '111' })
    mockPrisma.agentContact.findFirst.mockResolvedValue(null)
    mockPrisma.agentContact.create.mockResolvedValue({ id: 'ac-new' })

    await contacts.findOrCreateContact(agent, '111')

    expect(mockPrisma.agentContact.create).toHaveBeenCalledWith({
      data: { id: 'test-uuid', agentId: 'agent-1', contactId: 'contact-1' },
    })
  })
})
