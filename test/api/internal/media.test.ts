import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSendImage = vi.fn()
const mockSendDoc = vi.fn()
const mockSendVideo = vi.fn()

vi.mock('@/app/lib/whatsapp', () => ({
  sendImageMessage: mockSendImage,
  sendDocumentMessage: mockSendDoc,
  sendVideoMessage: mockSendVideo,
}))

const VALID_SECRET = 'test-secret'

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/media', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/media', () => {
  let route: typeof import('@/app/api/internal/media/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/media/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.POST(makeReq({}))
    expect(res.status).toBe(401)
  })

  it('returns 400 when mediaType is invalid', async () => {
    const res = await route.POST(makeReq({
      customerPhone: '111', mediaUrl: 'http://x.com/img.jpg', mediaType: 'gif',
    }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('sends image via sendImageMessage', async () => {
    mockSendImage.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      customerPhone: '111', mediaUrl: 'http://x.com/img.jpg', mediaType: 'image', caption: 'Look!',
    }, VALID_SECRET))
    expect(res.status).toBe(200)
    expect(mockSendImage).toHaveBeenCalledWith('111', 'http://x.com/img.jpg', 'Look!')
  })

  it('sends document via sendDocumentMessage', async () => {
    mockSendDoc.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      customerPhone: '111', mediaUrl: 'http://x.com/menu.pdf', mediaType: 'document', filename: 'menu.pdf',
    }, VALID_SECRET))
    expect(res.status).toBe(200)
    expect(mockSendDoc).toHaveBeenCalledWith('111', 'http://x.com/menu.pdf', 'menu.pdf', undefined)
  })

  it('sends video via sendVideoMessage', async () => {
    mockSendVideo.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      customerPhone: '111', mediaUrl: 'http://x.com/clip.mp4', mediaType: 'video',
    }, VALID_SECRET))
    expect(res.status).toBe(200)
    expect(mockSendVideo).toHaveBeenCalledWith('111', 'http://x.com/clip.mp4', undefined)
  })

  it('returns sent: true and mediaType', async () => {
    mockSendImage.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      customerPhone: '111', mediaUrl: 'http://x.com/img.jpg', mediaType: 'image',
    }, VALID_SECRET))
    const body = await res.json()
    expect(body.sent).toBe(true)
    expect(body.mediaType).toBe('image')
  })
})
