const ERIC_PHONE  = process.env.ERIC_PHONE  || ''
const META_WA_TOKEN = process.env.META_WA_TOKEN || ''
const META_PHONE_ID = process.env.META_PHONE_ID || ''

/**
 * Send a WhatsApp alert to Eric (EPIC admin).
 * Non-blocking — failures are logged but don't propagate.
 */
export async function alertEric(message: string): Promise<void> {
  if (!ERIC_PHONE || !META_WA_TOKEN || !META_PHONE_ID) {
    console.warn('[alert] Skipped — ERIC_PHONE/META_WA_TOKEN/META_PHONE_ID not set')
    return
  }
  try {
    await fetch(`https://graph.facebook.com/v25.0/${META_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_WA_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: ERIC_PHONE,
        type: 'text',
        text: { body: message },
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err: any) {
    console.error('[alert] Failed to alert Eric:', err.message)
  }
}
