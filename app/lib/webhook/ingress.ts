// app/lib/webhook/ingress.ts
// Phase 2: extracted from app/api/whatsapp/webhook/route.ts
//
// Responsibilities:
//   parseWebhookBody  — pull the envelope apart, no side-effects
//   extractText       — resolve final text from any message type (async: voice transcription)
//   checkDedup        — return true if metaMessageId already stored
import { transcribeVoiceNote } from '@/app/lib/transcribe'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'
import { prisma } from '@/app/lib/prisma'

export interface ParsedMessage {
  incomingPhoneId: string
  from: string
  metaMessageId: string | null
  contactName: string | undefined
  messageType: string
  rawMessage: any
  change: any
}

/**
 * Pull the Meta webhook envelope apart.
 * Returns null if the payload does not contain a message (e.g. status-update-only payloads).
 * No async, no side-effects.
 */
export function parseWebhookBody(body: any): ParsedMessage | null {
  const change = body?.entry?.[0]?.changes?.[0]?.value
  const message = change?.messages?.[0]
  if (!message) return null

  const incomingPhoneId: string =
    change?.metadata?.phone_number_id || process.env.META_PHONE_ID || '1003873729481088'

  const from = String(message.from || '').trim()
  if (!from) return null

  return {
    incomingPhoneId,
    from,
    metaMessageId: String(message.id || '') || null,
    contactName: change?.contacts?.[0]?.profile?.name as string | undefined,
    messageType: message.type,
    rawMessage: message,
    change,
  }
}

/**
 * Resolve the canonical text content for any message type.
 *
 * Returns null and sends an error reply when:
 *   - Voice transcription fails
 *   - Text is still empty after all type checks
 *
 * Side-effects: may call sendWhatsAppMessage on transcription failure.
 */
export async function extractText(
  parsed: ParsedMessage,
): Promise<{ text: string; wasVoiceNote: boolean } | null> {
  const { rawMessage, incomingPhoneId, from } = parsed
  let text = String(rawMessage.text?.body || '').trim()
  let wasVoiceNote = false

  // Interactive — button replies and list replies
  if (!text && rawMessage.type === 'interactive') {
    const interactive = rawMessage.interactive
    if (interactive?.type === 'button_reply') {
      text = interactive.button_reply?.title || interactive.button_reply?.id || ''
      // Normalise owner-command button IDs to command strings
      const btnId = interactive.button_reply?.id || ''
      if (btnId === 'cmd_status') text = 'status'
      else if (btnId === 'cmd_pause') text = 'pause'
      else if (btnId === 'cmd_resume') text = 'resume'
    } else if (interactive?.type === 'list_reply') {
      text = interactive.list_reply?.title || interactive.list_reply?.id || ''
    }
  }

  // Voice / audio — async transcription
  if (!text && rawMessage.type === 'audio' && rawMessage.audio?.id) {
    console.log(`[WA] Voice note from ${from}, media ID: ${rawMessage.audio.id}`)
    const transcribed = await transcribeVoiceNote(rawMessage.audio.id)
    if (transcribed) {
      text = transcribed
      wasVoiceNote = true
      console.log(`[WA] Transcribed voice note: "${text.slice(0, 100)}"`)
    } else {
      await sendWhatsAppMessage(
        from,
        "I got your voice message! \ud83c\udf99\ufe0f Unfortunately I couldn\u2019t process it right now \u2014 please type your message instead.",
        incomingPhoneId,
      )
      return null
    }
  }

  // Image
  if (!text && rawMessage.type === 'image') {
    const caption = rawMessage.image?.caption || ''
    text = caption ? `[Image] ${caption}` : '[Image shared]'
  }

  // Document
  if (!text && rawMessage.type === 'document') {
    const filename = rawMessage.document?.filename || 'document'
    const caption = rawMessage.document?.caption || ''
    text = caption ? `[Document: ${filename}] ${caption}` : `[Document shared: ${filename}]`
  }

  // Location
  if (!text && rawMessage.type === 'location') {
    const lat = rawMessage.location?.latitude
    const lng = rawMessage.location?.longitude
    const locName = rawMessage.location?.name || ''
    text = locName ? `[Location: ${locName}]` : `[Location: ${lat}, ${lng}]`
  }

  // Sticker
  if (!text && rawMessage.type === 'sticker') {
    text = '[Sticker]'
  }

  if (!text) return null

  return { text, wasVoiceNote }
}

/**
 * Returns true if this metaMessageId has already been processed.
 * Call after text extraction, before expensive DB lookups.
 */
export async function checkDedup(metaMessageId: string | null): Promise<boolean> {
  if (!metaMessageId) return false
  const existing = await prisma.whatsAppMessage
    .findFirst({ where: { metaMessageId } })
    .catch(() => null)
  return existing !== null
}
