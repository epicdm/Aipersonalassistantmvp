/**
 * WhatsApp Cloud API — Number Registration & OTP Verification
 *
 * Flow:
 * 1. registerPhoneNumber()        — add DID to our WABA, get phone_number_id
 * 2. requestVerificationCode()    — Meta calls/texts the DID with a code
 * 3. verifyPhoneNumber()          — submit the 6-digit code
 * 4. activatePhoneNumber()        — POST /register to make the number live for messaging
 *                                   (Cloud API requires this after OTP — no certificate needed)
 */

const META_TOKEN    = process.env.META_WA_TOKEN || ''
const WABA_ID       = process.env.META_WABA_ID  || ''
const META_API_BASE = 'https://graph.facebook.com/v25.0'

export interface PhoneRegistrationResult {
  success: boolean
  phoneNumberId?: string
  error?: string
}

/**
 * Step 1: Add a phone number to our WABA.
 * Returns the new phone_number_id once Meta acknowledges.
 */
export async function registerPhoneNumber(
  did: string,            // e.g. "17678180001"
  displayName: string,    // e.g. "Tiffany's Boutique"
): Promise<PhoneRegistrationResult> {
  if (!META_TOKEN || !WABA_ID) {
    return { success: false, error: 'META_WA_TOKEN or META_WABA_ID not configured' }
  }

  const e164 = `+${did}` // Meta expects E.164

  try {
    const res = await fetch(`${META_API_BASE}/${WABA_ID}/phone_numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify({
        cc: '1',                        // country code
        phone_number: did.slice(1),     // without leading 1
        migrate_phone_number: false,
        verified_name: displayName.slice(0, 100),
      }),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data?.error?.message || `Meta API ${res.status}` }
    }

    const phoneNumberId = data?.id || data?.phone_number_id
    return { success: true, phoneNumberId }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Step 2: Ask Meta to send the OTP.
 * method: 'VOICE' (Meta calls the DID and reads digits aloud)
 */
export async function requestVerificationCode(
  phoneNumberId: string,
  method: 'VOICE' | 'SMS' = 'VOICE',
  locale = 'en_US',
): Promise<{ success: boolean; error?: string }> {
  if (!META_TOKEN) return { success: false, error: 'META_WA_TOKEN not configured' }

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/request_code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify({ code_method: method, language: locale }),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `Meta API ${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Step 3: Submit the 6-digit OTP to complete verification.
 */
export async function verifyPhoneNumber(
  phoneNumberId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  if (!META_TOKEN) return { success: false, error: 'META_WA_TOKEN not configured' }

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/verify_code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `Meta API ${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Step 4: Activate the number for messaging (POST /register).
 * Must be called after verifyPhoneNumber() — without this, the number is verified
 * but cannot send or receive WhatsApp messages.
 *
 * For Cloud API, no certificate is needed — just the PIN you choose.
 * Store META_WA_PIN in env (e.g. "123456"). Same PIN for all EPIC-owned DIDs.
 */
export async function activatePhoneNumber(
  phoneNumberId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!META_TOKEN) return { success: false, error: 'META_WA_TOKEN not configured' }

  const pin = process.env.META_WA_PIN || '123456'

  try {
    const res = await fetch(`${META_API_BASE}/${phoneNumberId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `Meta register ${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Get the current status of a registered phone number.
 */
export async function getPhoneNumberStatus(phoneNumberId: string): Promise<{
  status: string
  verifiedName?: string
  qualityRating?: string
} | null> {
  if (!META_TOKEN) return null
  try {
    const res = await fetch(
      `${META_API_BASE}/${phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`,
      { headers: { Authorization: `Bearer ${META_TOKEN}` }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return {
      status: data.code_verification_status || 'unknown',
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating,
    }
  } catch {
    return null
  }
}
