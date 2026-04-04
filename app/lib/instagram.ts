/**
 * Instagram integration — DMs, profiles, sending, story/comment automation.
 * Extracted from google.ts for Batch 3 multi-channel support.
 */

import { metaFetch } from '@/app/lib/api-retry'

// Re-export types and functions from google.ts for backward compat
export type { InstagramProfile, InstagramDM } from '@/app/lib/google'
export { getInstagramProfile, getInstagramDMs, formatInstagramForAgent } from '@/app/lib/google'

const META_TOKEN = process.env.META_WA_TOKEN || ''

// ─── Send Instagram Message ──────────────────────────────────────────────────

export async function sendInstagramMessage(
  recipientId: string,
  message: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required for Instagram DMs')

  await metaFetch(
    `https://graph.facebook.com/v25.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
      }),
    }
  )
}

export async function sendInstagramImage(
  recipientId: string,
  imageUrl: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required for Instagram DMs')

  await metaFetch(
    `https://graph.facebook.com/v25.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: { type: 'image', payload: { url: imageUrl } },
        },
      }),
    }
  )
}
