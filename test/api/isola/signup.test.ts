import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/app/lib/prisma'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock alert
vi.mock('@/app/lib/alert', () => ({
  alertEric: vi.fn(),
}))

function makeRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/isola/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/isola/signup', () => {
  let POST: typeof import('@/app/api/isola/signup/route').POST

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('@/app/api/isola/signup/route')
    POST = mod.POST
  })

  it('returns 400 when phoneNumberId is missing', async () => {
    const res = await POST(makeRequest({ code: 'abc', wabaId: '123' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('phoneNumberId')
  })

  it('returns 400 when wabaId is missing', async () => {
    const res = await POST(makeRequest({ code: 'abc', phoneNumberId: '123' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('wabaId')
  })

  it('returns 400 when code exchange fails (Meta returns error)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 400,
      json: () => Promise.resolve({ error: { message: 'Invalid code' } }),
    })

    const res = await POST(makeRequest({ code: 'bad-code', phoneNumberId: 'p1', wabaId: 'w1' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Code exchange failed')
  })

  it('returns 503 when code exchange has network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await POST(makeRequest({ code: 'code', phoneNumberId: 'p1', wabaId: 'w1' }))
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data.error).toContain('Meta')
  })

  it('returns 409 when phone number already provisioned', async () => {
    // Code exchange succeeds
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'token123' }),
    })
    // Register succeeds
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })
    // Subscribe succeeds
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })
    // Business info fetch
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ business: { id: 'b1', name: 'Test Biz' } }),
    })

    // Duplicate check returns existing
    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue({
      tenantId: 'existing-tenant',
    } as any)

    const res = await POST(makeRequest({ code: 'code', phoneNumberId: 'p1', wabaId: 'w1' }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain('already provisioned')
  })

  it('returns 503 when port sequence is exhausted', async () => {
    // Code exchange
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'token123' }),
    })
    // Register + Subscribe + Business
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ business: {} }) })

    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('SEQUENCE exhausted'))

    const res = await POST(makeRequest({ code: 'code', phoneNumberId: 'p1', wabaId: 'w1' }))
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data.error).toContain('capacity')
  })

  it('returns 500 when OCMT call fails', async () => {
    // Code exchange
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'token123' }),
    })
    // Register + Subscribe + Business
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ business: { id: 'b1' } }) })

    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ nextval: BigInt(3200) }])
    vi.mocked(prisma.tenantRegistry.create).mockResolvedValue({} as any)
    vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

    // OCMT returns 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('internal error'),
    })

    const res = await POST(makeRequest({ code: 'code', phoneNumberId: 'p1', wabaId: 'w1' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('provisioning failed')

    // Should set status to 'failed'
    expect(prisma.tenantRegistry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } })
    )
  })

  it('returns 503 when OCMT is unreachable', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'token123' }),
    })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ business: {} }) })

    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ nextval: BigInt(3201) }])
    vi.mocked(prisma.tenantRegistry.create).mockResolvedValue({} as any)
    vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

    // OCMT unreachable
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await POST(makeRequest({ code: 'code', phoneNumberId: 'p1', wabaId: 'w1' }))
    expect(res.status).toBe(503)
  })

  it('returns 202 on happy path', async () => {
    // Code exchange
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'real-token' }),
    })
    // Register
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    // Subscribe
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    // Business info
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ business: { id: 'biz-123', name: 'Glenn Biz' } }),
    })
    // OCMT
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ nextval: BigInt(3202) }])
    vi.mocked(prisma.tenantRegistry.create).mockResolvedValue({} as any)

    const res = await POST(makeRequest({
      code: 'valid-code',
      phoneNumberId: 'phone-1',
      wabaId: 'waba-1',
      displayPhone: '+17671234567',
      businessName: 'Glenn',
    }))

    expect(res.status).toBe(202)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.tenantId).toBeDefined()

    // Verify TenantRegistry.create was called with correct fields
    expect(prisma.tenantRegistry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        waPhoneNumberId: 'phone-1',
        containerPort: 3202,
        tokenType: 'expiring',
        tokenExpiresAt: expect.any(Date),
        businessId: 'biz-123',
        wabaId: 'waba-1',
        displayPhone: '+17671234567',
        businessName: 'Glenn', // request value preserved (Meta only fills if absent)
        status: 'provisioning',
      }),
    })
  })

  it('proceeds without business_id when fetch fails (graceful degradation)', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'token' }),
    })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    // Business info fetch fails
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    // OCMT succeeds
    mockFetch.mockResolvedValueOnce({ ok: true })

    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ nextval: BigInt(3203) }])
    vi.mocked(prisma.tenantRegistry.create).mockResolvedValue({} as any)

    const res = await POST(makeRequest({
      code: 'code',
      phoneNumberId: 'p1',
      wabaId: 'w1',
      businessName: 'Fallback Name',
    }))

    expect(res.status).toBe(202)

    // businessId should be null, but businessName from request preserved
    expect(prisma.tenantRegistry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: null,
        businessName: 'Fallback Name',
      }),
    })
  })

  it('returns 500 and logs leaked port when DB write fails', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'token' }),
    })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ business: {} }) })

    vi.mocked(prisma.tenantRegistry.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ nextval: BigInt(3204) }])
    vi.mocked(prisma.tenantRegistry.create).mockRejectedValue(new Error('DB connection lost'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest({
      code: 'code', phoneNumberId: 'p1', wabaId: 'w1',
    }))

    expect(res.status).toBe(500)
    // Should log the leaked port
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('LEAKED PORT'),
      3204,
      expect.any(String)
    )

    consoleSpy.mockRestore()
  })
})
