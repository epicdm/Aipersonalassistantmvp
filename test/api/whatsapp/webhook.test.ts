import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// ─── Test helpers ─────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-app-secret'

function makeWebhookBody(from: string, text: string, phoneNumberId = 'test-phone-id') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: phoneNumberId },
          contacts: [{ profile: { name: 'Test User' }, wa_id: from }],
          messages: [{
            from,
            id: `wamid.${Date.now()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: text },
          }],
        },
        field: 'messages',
      }],
    }],
  }
}

function makeSignature(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex')
}

function tick(ms = 50) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSendMessage = vi.fn().mockResolvedValue(undefined)
const mockSendVoiceNote = vi.fn().mockResolvedValue(undefined)
const mockSendButtons = vi.fn().mockResolvedValue(undefined)
const mockSendTyping = vi.fn().mockResolvedValue(undefined)
const mockSendList = vi.fn().mockResolvedValue(undefined)

vi.mock('@/app/lib/whatsapp', () => ({
  sendWhatsAppMessage: (...args: any[]) => mockSendMessage(...args),
  sendWhatsAppVoiceNote: (...args: any[]) => mockSendVoiceNote(...args),
  sendInteractiveButtons: (...args: any[]) => mockSendButtons(...args),
  sendInteractiveList: (...args: any[]) => mockSendList(...args),
  sendTypingIndicator: (...args: any[]) => mockSendTyping(...args),
  resolvePhoneId: vi.fn().mockReturnValue('test-phone-id'),
}))

vi.mock('@/app/lib/knowledge', () => ({
  buildKnowledgeContext: vi.fn().mockResolvedValue(''),
}))

vi.mock('@/app/lib/onboarding', () => ({
  extractKnowledge: vi.fn().mockResolvedValue({}),
  getOnboardingOpener: vi.fn().mockReturnValue('Welcome!'),
  TEMPLATE_QUESTIONS: {},
}))

vi.mock('@/app/lib/transcribe', () => ({
  transcribeVoiceNote: vi.fn().mockResolvedValue('transcribed text'),
}))

vi.mock('@/app/lib/meta-verify', () => ({
  verifyMetaSignature: vi.fn().mockImplementation((rawBody: Buffer, sig: string) => {
    if (!sig) return false
    const expected = 'sha256=' + crypto.createHmac('sha256', TEST_SECRET).update(rawBody).digest('hex')
    return sig === expected
  }),
}))

// Mock global fetch for LLM + tenant proxy calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Extended prisma mock
const mockPrisma: any = {
  tenantRegistry: { findUnique: vi.fn().mockResolvedValue(null) },
  agent: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn().mockResolvedValue({}) },
  user: { findFirst: vi.fn(), findUnique: vi.fn() },
  contact: { findFirst: vi.fn(), create: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  agentContact: { upsert: vi.fn().mockResolvedValue({}) },
  conversation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({}) },
  whatsAppMessage: { create: vi.fn().mockResolvedValue({}), findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  messageDraft: { create: vi.fn().mockResolvedValue({}) },
  agentActivity: { create: vi.fn().mockResolvedValue({}) },
  $queryRaw: vi.fn(),
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

// ─── Shared agent fixture ─────────────────────────────────────────────────────

function makeAgent(overrides: Record<string, any> = {}) {
  return {
    id: 'agent-1', name: 'Test Agent', userId: 'user-1',
    status: 'active', template: 'retail', approvalMode: 'auto',
    config: { knowledge: { businessName: 'Test Biz' } },
    ownerPhone: '17679999999', isActive: true,
    onboardingStatus: 'complete', onboardingStep: 5,
    ...overrides,
  }
}

function setupBffAgentMocks(agent: any, contactExists = true) {
  mockPrisma.tenantRegistry.findUnique.mockResolvedValue(null)
  mockPrisma.agent.findFirst.mockResolvedValue(agent)
  if (contactExists) {
    mockPrisma.contact.findFirst.mockResolvedValue({ id: 'contact-1', name: 'Test User', phone: '17671234567' })
  } else {
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    mockPrisma.contact.create.mockResolvedValue({ id: 'contact-1', name: 'Test User', phone: '17671234567' })
  }
  mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1' })
  mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WhatsApp Webhook', () => {
  let POST: any
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.META_APP_SECRET = TEST_SECRET
    process.env.META_WA_TOKEN = 'test-token'
    process.env.META_PHONE_ID = 'test-phone-id'

    // Default LLM response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello! How can I help?' } }] }),
    })

    vi.resetModules()
    const mod = await import('@/app/api/whatsapp/webhook/route')
    POST = mod.POST
    GET = mod.GET
  })

  // ─── GET verification ───────────────────────────────────────────────────────

  describe('GET verification', () => {
    it('accepts valid verify token', async () => {
      const url = new URL('http://localhost/api/whatsapp/webhook')
      url.searchParams.set('hub.mode', 'subscribe')
      url.searchParams.set('hub.verify_token', 'epic-wa-2026')
      url.searchParams.set('hub.challenge', 'challenge-123')

      const res = await GET({ nextUrl: url } as any)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('challenge-123')
    })

    it('rejects wrong verify token', async () => {
      const url = new URL('http://localhost/api/whatsapp/webhook')
      url.searchParams.set('hub.mode', 'subscribe')
      url.searchParams.set('hub.verify_token', 'wrong')
      url.searchParams.set('hub.challenge', 'x')

      const res = await GET({ nextUrl: url } as any)
      expect(res.status).toBe(403)
    })
  })

  // ─── POST signature verification ────────────────────────────────────────────

  describe('POST signature', () => {
    it('rejects missing signature with 401', async () => {
      const body = JSON.stringify(makeWebhookBody('17671234567', 'hi'))
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json' },
      })
      const res = await POST(req as any)
      expect(res.status).toBe(401)
    })

    it('rejects invalid signature with 401', async () => {
      const body = JSON.stringify(makeWebhookBody('17671234567', 'hi'))
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=bad' },
      })
      const res = await POST(req as any)
      expect(res.status).toBe(401)
    })

    it('accepts valid signature', async () => {
      mockPrisma.tenantRegistry.findUnique.mockResolvedValue(null)
      mockPrisma.agent.findFirst.mockResolvedValue(null)

      const body = JSON.stringify(makeWebhookBody('17671234567', 'hi'))
      const sig = makeSignature(body)
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig },
      })
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })
  })

  // ─── Tenant routing ─────────────────────────────────────────────────────────

  describe('tenant routing', () => {
    it('proxies to tenant container when phone matches tenant', async () => {
      mockPrisma.tenantRegistry.findUnique.mockResolvedValue({
        tenantId: 'tenant-1', waPhoneNumberId: 'tenant-phone',
        containerPort: 3201, status: 'active',
      })
      // Proxy fetch succeeds
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'OK', headers: new Headers() })

      const body = JSON.stringify(makeWebhookBody('17671234567', 'Hi', 'tenant-phone'))
      const sig = makeSignature(body)
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig },
      })
      await POST(req as any)
      await tick(100)

      // Should have proxied to tenant container
      expect(mockFetch).toHaveBeenCalledWith(
        'http://66.118.37.12:3201/webhook',
        expect.objectContaining({ method: 'POST' })
      )
      // Should NOT have looked up BFF agents
      expect(mockPrisma.agent.findFirst).not.toHaveBeenCalled()
    })

    it('falls through to BFF when no tenant match', async () => {
      setupBffAgentMocks(makeAgent())

      const body = JSON.stringify(makeWebhookBody('17671234567', 'Hello'))
      const sig = makeSignature(body)
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig },
      })
      await POST(req as any)
      await tick(200)

      // Should have checked tenant registry (returned null) then continued to BFF logic
      expect(mockPrisma.tenantRegistry.findUnique).toHaveBeenCalled()
    })
  })

  // ─── Message processing ──────────────────────────────────────────────────────

  describe('message processing', () => {
    it('processes valid webhook and sends a response', async () => {
      setupBffAgentMocks(makeAgent())

      const body = JSON.stringify(makeWebhookBody('17671234567', 'What are your hours?'))
      const sig = makeSignature(body)
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig },
      })
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      await tick(300)

      // Should have sent some response to the customer (text, buttons, or list)
      const totalSent = mockSendMessage.mock.calls.length
        + mockSendButtons.mock.calls.length
        + mockSendList.mock.calls.length
      expect(totalSent).toBeGreaterThan(0)
    })

    it('handles missing agent gracefully', async () => {
      mockPrisma.tenantRegistry.findUnique.mockResolvedValue(null)
      mockPrisma.agent.findFirst.mockResolvedValue(null)

      const body = JSON.stringify(makeWebhookBody('17671234567', 'Hello'))
      const sig = makeSignature(body)
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig },
      })
      const res = await POST(req as any)
      // Should return 200 (fire-and-forget) even if no agent found
      expect(res.status).toBe(200)
    })

    it('handles empty webhook body gracefully', async () => {
      const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: {} }] }] })
      const sig = makeSignature(body)
      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST', body,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig },
      })
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })
  })
})
