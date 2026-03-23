const DEFAULT_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '1003873729481088'
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const META_TOKEN = process.env.META_WA_TOKEN || WHATSAPP_TOKEN
const TTS_URL = 'http://localhost:3007/tts'

// Phone number ID map — add new numbers here
export const PHONE_ID_MAP: Record<string, string> = {
  '17672950333': '1003873729481088',    // BFF shared number
  '17672851568': '294957850360835',     // EPIC Communications dedicated number
}

// Resolve phone ID — use override if provided, else default
export function resolvePhoneId(override?: string): string {
  if (override) return override
  return DEFAULT_PHONE_ID
}

export async function sendWhatsAppMessage(phone: string, message: string, fromPhoneId?: string): Promise<void> {
  const token = META_TOKEN || WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN not configured')
  const phoneId = fromPhoneId || DEFAULT_PHONE_ID

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error: ${err}`)
  }
}

export async function sendWhatsAppVoiceNote(phone: string, text: string, voice = 'en-US-JennyNeural', fromPhoneId?: string): Promise<void> {
  const token = META_TOKEN || WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN not configured')
  const phoneId = fromPhoneId || DEFAULT_PHONE_ID

  const ttsRes = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
    signal: AbortSignal.timeout(15000),
  })
  if (!ttsRes.ok) throw new Error(`TTS failed: ${await ttsRes.text()}`)

  const audioBuffer = await ttsRes.arrayBuffer()
  const formData = new FormData()
  formData.append('messaging_product', 'whatsapp')
  formData.append('type', 'audio/mpeg')
  formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'voice.mp3')

  const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!uploadRes.ok) throw new Error(`Media upload failed: ${await uploadRes.text()}`)

  const uploadData = await uploadRes.json()
  const mediaId = uploadData.id
  if (!mediaId) throw new Error('No media ID returned from upload')

  const msgRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'audio',
      audio: { id: mediaId },
    }),
  })
  if (!msgRes.ok) throw new Error(`Audio send failed: ${await msgRes.text()}`)
}

export async function sendTypingIndicator(messageId: string, fromPhoneId?: string): Promise<void> {
  const token = META_TOKEN || WHATSAPP_TOKEN
  if (!token || !messageId) return
  const phoneId = fromPhoneId || DEFAULT_PHONE_ID
  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' },
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch { /* non-critical */ }
}

export async function sendInteractiveButtons(
  phone: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
  headerText?: string,
  footerText?: string,
  fromPhoneId?: string
): Promise<void> {
  const token = META_TOKEN || WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN not configured')
  const phoneId = fromPhoneId || DEFAULT_PHONE_ID

  const interactive: any = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map((btn) => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title.slice(0, 20) },
      })),
    },
  }
  if (headerText) interactive.header = { type: 'text', text: headerText }
  if (footerText) interactive.footer = { text: footerText }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'interactive', interactive }),
  })
  if (!res.ok) {
    console.error('[WA Interactive Buttons]', await res.text())
    await sendWhatsAppMessage(phone, bodyText, fromPhoneId)
  }
}

export async function sendInteractiveList(
  phone: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  headerText?: string,
  footerText?: string,
  fromPhoneId?: string
): Promise<void> {
  const token = META_TOKEN || WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN not configured')
  const phoneId = fromPhoneId || DEFAULT_PHONE_ID

  const interactive: any = {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonLabel.slice(0, 20),
      sections: sections.map((s) => ({
        title: s.title.slice(0, 24),
        rows: s.rows.slice(0, 10).map((r) => ({
          id: r.id.slice(0, 200),
          title: r.title.slice(0, 24),
          description: r.description?.slice(0, 72),
        })),
      })),
    },
  }
  if (headerText) interactive.header = { type: 'text', text: headerText }
  if (footerText) interactive.footer = { text: footerText }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'interactive', interactive }),
  })
  if (!res.ok) {
    console.error('[WA Interactive List]', await res.text())
    await sendWhatsAppMessage(phone, bodyText, fromPhoneId)
  }
}

export async function markAsRead(messageId: string, fromPhoneId?: string): Promise<void> {
  const token = META_TOKEN || WHATSAPP_TOKEN
  if (!token || !messageId) return
  const phoneId = fromPhoneId || DEFAULT_PHONE_ID
  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
      signal: AbortSignal.timeout(5000),
    })
  } catch { /* non-critical */ }
}
