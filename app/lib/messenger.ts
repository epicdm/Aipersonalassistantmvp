/**
 * Facebook Messenger integration — send/receive messages.
 * Uses Page Access Token (from Facebook Login) for Messenger API.
 */

import { metaFetch } from '@/app/lib/api-retry'

const META_TOKEN = process.env.META_WA_TOKEN || ''

// ─── Send Messages ───────────────────────────────────────────────────────────

export async function sendMessengerMessage(
  recipientPsid: string,
  text: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required for Messenger')

  await metaFetch(
    `https://graph.facebook.com/v25.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    }
  )
}

export async function sendMessengerImage(
  recipientPsid: string,
  imageUrl: string,
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required for Messenger')

  await metaFetch(
    `https://graph.facebook.com/v25.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: {
          attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } },
        },
        messaging_type: 'RESPONSE',
      }),
    }
  )
}

export async function sendMessengerQuickReplies(
  recipientPsid: string,
  text: string,
  quickReplies: { title: string; payload: string }[],
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required for Messenger')

  await metaFetch(
    `https://graph.facebook.com/v25.0/me/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: {
          text,
          quick_replies: quickReplies.slice(0, 13).map(qr => ({
            content_type: 'text',
            title: qr.title.slice(0, 20),
            payload: qr.payload,
          })),
        },
        messaging_type: 'RESPONSE',
      }),
    }
  )
}

// ─── Persistent Menu ─────────────────────────────────────────────────────────

export async function setPersistentMenu(
  pageId: string,
  menuItems: { title: string; type: 'postback' | 'web_url'; payload?: string; url?: string }[],
  pageAccessToken?: string
): Promise<void> {
  const token = pageAccessToken || META_TOKEN
  if (!token) throw new Error('Page access token required')

  await metaFetch(
    `https://graph.facebook.com/v25.0/${pageId}/messenger_profile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        persistent_menu: [{
          locale: 'default',
          composer_input_disabled: false,
          call_to_actions: menuItems.slice(0, 3).map(item => ({
            type: item.type,
            title: item.title,
            ...(item.payload ? { payload: item.payload } : {}),
            ...(item.url ? { url: item.url } : {}),
          })),
        }],
      }),
    }
  )
}

// ─── Parse Messenger Webhook ─────────────────────────────────────────────────

export interface MessengerMessage {
  senderId: string
  recipientId: string
  text?: string
  attachments?: { type: string; payload: { url: string } }[]
  postback?: { title: string; payload: string }
  timestamp: number
}

export function parseMessengerWebhook(body: any): MessengerMessage[] {
  const messages: MessengerMessage[] = []

  for (const entry of body?.entry || []) {
    for (const event of entry?.messaging || []) {
      const msg: MessengerMessage = {
        senderId: event.sender?.id || '',
        recipientId: event.recipient?.id || '',
        timestamp: event.timestamp || Date.now(),
      }

      if (event.message?.text) {
        msg.text = event.message.text
      }
      if (event.message?.attachments) {
        msg.attachments = event.message.attachments
      }
      if (event.postback) {
        msg.postback = event.postback
      }

      if (msg.senderId && (msg.text || msg.attachments || msg.postback)) {
        messages.push(msg)
      }
    }
  }

  return messages
}
