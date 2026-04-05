/**
 * POST /api/internal/media
 * Send an image, document, or video to a customer via WhatsApp.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, customerPhone, mediaUrl, mediaType, caption?, filename? }
 * Response: { sent: true, mediaType }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { sendImageMessage, sendDocumentMessage, sendVideoMessage } from '@/app/lib/whatsapp'

const VALID_TYPES = ['image', 'document', 'video'] as const
type MediaType = typeof VALID_TYPES[number]

export async function POST(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { customerPhone, mediaUrl, mediaType, caption, filename } = body

  if (!customerPhone || !mediaUrl || !mediaType) {
    return NextResponse.json({ error: 'customerPhone, mediaUrl, mediaType required' }, { status: 400 })
  }

  if (!VALID_TYPES.includes(mediaType as MediaType)) {
    return NextResponse.json({ error: `mediaType must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  try {
    const phone = customerPhone as string
    const url = mediaUrl as string

    switch (mediaType as MediaType) {
      case 'image':
        await sendImageMessage(phone, url, caption as string | undefined)
        break
      case 'document':
        await sendDocumentMessage(phone, url, filename as string | undefined, caption as string | undefined)
        break
      case 'video':
        await sendVideoMessage(phone, url, caption as string | undefined)
        break
    }

    return NextResponse.json({ sent: true, mediaType })
  } catch (err) {
    console.error('[internal/media] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
