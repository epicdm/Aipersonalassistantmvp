import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/app/lib/prisma'

// Mock alert
vi.mock('@/app/lib/alert', () => ({
  alertEric: vi.fn(),
}))

const TEST_SECRET = 'test-app-secret'

function makeSignedRequest(body: any): NextRequest {
  const bodyStr = JSON.stringify(body)
  const sig = 'sha256=' + crypto.createHmac('sha256', TEST_SECRET).update(bodyStr).digest('hex')
  return new NextRequest('http://localhost/api/whatsapp/account-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sig,
    },
    body: bodyStr,
  })
}

function makeUnsignedRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/whatsapp/account-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': 'sha256=invalid' },
    body: JSON.stringify(body),
  })
}

describe('/api/whatsapp/account-update', () => {
  let POST: typeof import('@/app/api/whatsapp/account-update/route').POST
  let GET: typeof import('@/app/api/whatsapp/account-update/route').GET

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.META_APP_SECRET = TEST_SECRET
    const mod = await import('@/app/api/whatsapp/account-update/route')
    POST = mod.POST
    GET = mod.GET
  })

  describe('GET (verification challenge)', () => {
    it('responds with challenge when token matches', async () => {
      const req = new NextRequest(
        'http://localhost/api/whatsapp/account-update?hub.mode=subscribe&hub.verify_token=epic-wa-2026&hub.challenge=test-challenge-123'
      )
      const res = await GET(req)
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('test-challenge-123')
    })

    it('returns 403 when token does not match', async () => {
      const req = new NextRequest(
        'http://localhost/api/whatsapp/account-update?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test'
      )
      const res = await GET(req)
      expect(res.status).toBe(403)
    })
  })

  describe('POST (account updates)', () => {
    it('rejects invalid signature with 401', async () => {
      const res = await POST(makeUnsignedRequest({ entry: [] }))
      expect(res.status).toBe(401)
    })

    it('handles account DISABLED event', async () => {
      const { alertEric } = await import('@/app/lib/alert')
      vi.mocked(prisma.tenantRegistry.findFirst).mockResolvedValue({
        tenantId: 'tenant-1',
      } as any)
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      const body = {
        entry: [{
          id: 'waba-123',
          changes: [{
            field: 'account_update',
            value: { event: 'DISABLED', ban_info: { waba_ban_state: 'SCHEDULE_FOR_DISABLE' } },
          }],
        }],
      }

      const res = await POST(makeSignedRequest(body))
      expect(res.status).toBe(200)

      expect(prisma.tenantRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'suspended' } })
      )
      expect(alertEric).toHaveBeenCalledWith(expect.stringContaining('DISABLED'))
    })

    it('handles account FLAGGED event', async () => {
      const { alertEric } = await import('@/app/lib/alert')
      vi.mocked(prisma.tenantRegistry.findFirst).mockResolvedValue({
        tenantId: 'tenant-2',
      } as any)
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      const body = {
        entry: [{
          id: 'waba-456',
          changes: [{
            field: 'account_update',
            value: { event: 'FLAGGED' },
          }],
        }],
      }

      const res = await POST(makeSignedRequest(body))
      expect(res.status).toBe(200)
      expect(alertEric).toHaveBeenCalledWith(expect.stringContaining('FLAGGED'))
    })

    it('handles phone quality update', async () => {
      vi.mocked(prisma.tenantRegistry.findFirst).mockResolvedValue({
        tenantId: 'tenant-3',
      } as any)
      vi.mocked(prisma.agentActivity.create).mockResolvedValue({} as any)

      const body = {
        entry: [{
          id: 'waba-789',
          changes: [{
            field: 'phone_number_quality_update',
            value: { current_limit: 'TIER_1K' },
          }],
        }],
      }

      const res = await POST(makeSignedRequest(body))
      expect(res.status).toBe(200)
    })

    it('handles unknown event type gracefully', async () => {
      const body = {
        entry: [{
          id: 'waba-000',
          changes: [{
            field: 'some_future_field',
            value: { something: 'new' },
          }],
        }],
      }

      const res = await POST(makeSignedRequest(body))
      expect(res.status).toBe(200)
    })

    it('handles empty entry array', async () => {
      const res = await POST(makeSignedRequest({ entry: [] }))
      expect(res.status).toBe(200)
    })
  })
})
