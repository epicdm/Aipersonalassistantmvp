import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMetaFetch = vi.fn()
vi.mock('@/app/lib/api-retry', () => ({
  metaFetch: (...args: any[]) => mockMetaFetch(...args),
}))

const mockPrisma: any = {
  agentContact: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
}
vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

describe('whatsapp-templates', () => {
  let mod: typeof import('@/app/lib/whatsapp-templates')

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.META_WA_TOKEN = 'test-token'
    process.env.META_WABA_ID = 'test-waba-id'
    process.env.WHATSAPP_PHONE_ID = 'test-phone-id'

    vi.resetModules()
    mod = await import('@/app/lib/whatsapp-templates')
  })

  describe('createTemplate', () => {
    it('sends correct payload to Meta API', async () => {
      mockMetaFetch.mockResolvedValue({
        json: async () => ({ id: 'tmpl-123', status: 'PENDING' }),
      })

      const result = await mod.createTemplate({
        name: 'appointment_reminder',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          { type: 'BODY', text: 'Hi {{1}}, reminder for {{2}} at {{3}} on {{4}}.' },
        ],
      })

      expect(mockMetaFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-waba-id/message_templates'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.status).toBe('PENDING')
    })

    it('throws when credentials missing', async () => {
      process.env.META_WA_TOKEN = ''
      vi.resetModules()
      const freshMod = await import('@/app/lib/whatsapp-templates')

      await expect(freshMod.createTemplate({
        name: 'test', language: 'en_US', category: 'UTILITY', components: [],
      })).rejects.toThrow('META_WA_TOKEN and META_WABA_ID required')
    })
  })

  describe('getTemplates', () => {
    it('fetches templates with optional status filter', async () => {
      mockMetaFetch.mockResolvedValue({
        json: async () => ({
          data: [
            { name: 'welcome', status: 'APPROVED' },
            { name: 'reminder', status: 'APPROVED' },
          ],
        }),
      })

      const templates = await mod.getTemplates('APPROVED')

      expect(mockMetaFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=APPROVED'),
        expect.any(Object)
      )
      expect(templates).toHaveLength(2)
    })
  })

  describe('sendTemplate', () => {
    it('sends template with variables', async () => {
      mockMetaFetch.mockResolvedValue({
        json: async () => ({ messages: [{ id: 'msg-123' }] }),
      })

      await mod.sendTemplate('17671234567', 'appointment_reminder', 'en_US', [
        { type: 'text', text: 'John' },
        { type: 'text', text: 'Dental Checkup' },
        { type: 'text', text: "Dr. Green's Office" },
        { type: 'text', text: 'April 5, 2pm' },
      ])

      expect(mockMetaFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-phone-id/messages'),
        expect.objectContaining({ method: 'POST' })
      )

      const body = JSON.parse(mockMetaFetch.mock.calls[0][1].body)
      expect(body.type).toBe('template')
      expect(body.template.name).toBe('appointment_reminder')
      expect(body.template.components[0].parameters).toHaveLength(4)
    })

    it('sends template without variables', async () => {
      mockMetaFetch.mockResolvedValue({
        json: async () => ({ messages: [{ id: 'msg-456' }] }),
      })

      await mod.sendTemplate('17671234567', 'welcome_message', 'en_US')

      const body = JSON.parse(mockMetaFetch.mock.calls[0][1].body)
      expect(body.template.name).toBe('welcome_message')
      expect(body.template.components).toBeUndefined()
    })
  })

  describe('sendAuthTemplate', () => {
    it('sends OTP with button parameter', async () => {
      mockMetaFetch.mockResolvedValue({
        json: async () => ({ messages: [{ id: 'msg-789' }] }),
      })

      await mod.sendAuthTemplate('17671234567', '123456')

      const body = JSON.parse(mockMetaFetch.mock.calls[0][1].body)
      expect(body.template.name).toBe('auth_otp')
      expect(body.template.components).toHaveLength(2)
      expect(body.template.components[0].parameters[0].text).toBe('123456')
      expect(body.template.components[1].type).toBe('button')
    })
  })

  describe('isWithin24hWindow', () => {
    it('returns true when last inbound < 24h ago', async () => {
      mockPrisma.agentContact.findUnique.mockResolvedValue({
        lastInboundAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12h ago
      })

      const result = await mod.isWithin24hWindow('agent-1', 'contact-1')
      expect(result).toBe(true)
    })

    it('returns false when last inbound > 24h ago', async () => {
      mockPrisma.agentContact.findUnique.mockResolvedValue({
        lastInboundAt: new Date(Date.now() - 1000 * 60 * 60 * 30), // 30h ago
      })

      const result = await mod.isWithin24hWindow('agent-1', 'contact-1')
      expect(result).toBe(false)
    })

    it('returns false when no lastInboundAt', async () => {
      mockPrisma.agentContact.findUnique.mockResolvedValue({
        lastInboundAt: null,
      })

      const result = await mod.isWithin24hWindow('agent-1', 'contact-1')
      expect(result).toBe(false)
    })

    it('returns false when agentContact not found', async () => {
      mockPrisma.agentContact.findUnique.mockResolvedValue(null)

      const result = await mod.isWithin24hWindow('agent-1', 'contact-1')
      expect(result).toBe(false)
    })
  })

  describe('touchInboundTimestamp', () => {
    it('updates lastInboundAt to now', async () => {
      await mod.touchInboundTimestamp('agent-1', 'contact-1')

      expect(mockPrisma.agentContact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agentId_contactId: { agentId: 'agent-1', contactId: 'contact-1' } },
          data: expect.objectContaining({ lastInboundAt: expect.any(Date) }),
        })
      )
    })

    it('does not throw if agentContact not found', async () => {
      mockPrisma.agentContact.update.mockRejectedValue(new Error('Not found'))

      // Should not throw
      await expect(mod.touchInboundTimestamp('agent-1', 'contact-1')).resolves.toBeUndefined()
    })
  })
})
