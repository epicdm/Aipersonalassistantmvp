/**
 * POST /api/isola/provision-number
 * Path B onboarding — business gets an EPIC 818-XXXX number.
 *
 * Flow:
 *   1. Provision DID in Magnus via REST API (provisionAgentDID)
 *   2. Install AGI + dialplan on voice00 for OTP capture (requires SSH to voice00)
 *   3. Register DID on EPIC's Meta WABA → get phoneNumberId
 *   4. Allocate container port
 *   5. Write tenantRegistry (status=pending_otp, didNumber=did)
 *   6. Trigger Meta to call DID with OTP
 *   7. Return { tenantId } — UI polls /api/isola/provision-status
 *
 * OTP arrives at voice00 → AGI → POST /api/voice/otp-callback
 * otp-callback verifies → status=provisioning → calls OCMT → container active.
 *
 * Body: { did, businessName, template }
 * Note: didId is ignored — Magnus claims the specific DID via REST API.
 *
 * Infrastructure requirement:
 *   SSH from BFF (66.118.37.63) to voice00 must be set up for OTP capture.
 *   Add BFF's public key (~/.ssh/id_rsa.pub) to root@voice00 authorized_keys.
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { provisionAgentDID } from '@/app/lib/magnus'
import { setupOTPCapture } from '@/app/lib/auto-provision'
import { registerPhoneNumber, requestVerificationCode, getPhoneNumberStatus } from '@/app/lib/whatsapp-provision'
import { encryptToken } from '@/app/lib/crypto'

export const dynamic = 'force-dynamic'

const META_WA_TOKEN = process.env.META_WA_TOKEN || ''

const VALID_TEMPLATES = ['pharmacy', 'professional', 'restaurant', 'retail']
const DID_RE          = /^1767818\d{4}$/

export async function POST(req: NextRequest) {
  let body: { did?: string; businessName?: string; template?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { did, businessName = 'My Business', template = 'professional' } = body

  if (!did || !DID_RE.test(did))
    return NextResponse.json({ error: 'Invalid DID format (must be 1767818XXXX)' }, { status: 400 })
  if (!VALID_TEMPLATES.includes(template))
    return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
  if (!META_WA_TOKEN)
    return NextResponse.json({ error: 'META_WA_TOKEN not configured' }, { status: 500 })

  // Guard against double-provisioning the same DID
  const dupDID = await prisma.tenantRegistry.findFirst({
    where: { didNumber: did },
  }).catch(() => null)
  if (dupDID) {
    return NextResponse.json({ error: 'This number is already in use', tenantId: dupDID.tenantId }, { status: 409 })
  }

  // Step 1: Provision DID in Magnus
  // Creates Magnus user + SIP account + DID record + OTP routing destination.
  // otpContext=true routes incoming calls to bff-otp-{did} Asterisk context.
  const tenantSlug = `isola-${did.slice(-4)}-${Date.now().toString(36)}`
  const magResult = await provisionAgentDID(
    tenantSlug,
    businessName.slice(0, 60),
    `${tenantSlug}@isola.epic.dm`,
    did,   // specific DID selected by user
    true,  // otpContext=true: route incoming calls to OTP capture
  ).catch((err: any) => ({ success: false, error: err.message }))

  if (!magResult.success) {
    console.error('[provision-number] Magnus provisioning failed:', magResult.error)
    console.warn('[provision-number] Proceeding without Magnus DID routing')
  } else {
    console.log(`[provision-number] Magnus DID provisioned: ${did} (userId=${(magResult as any).magnusUserId})`)
  }

  // Step 2: Set up AGI + dialplan on voice00 for OTP capture
  // Requires SSH access from BFF to voice00 (root@66.118.37.57).
  // If SSH not set up, OTP capture fails but provisioning continues.
  try {
    await setupOTPCapture(did)
    console.log(`[provision-number] AGI + dialplan installed for ${did}`)
  } catch (err: any) {
    console.warn(`[provision-number] AGI setup failed (voice00 SSH not configured?): ${err.message}`)
    // Provisioning continues — OTP will need manual handling if SSH not set up
  }

  // Step 3: Register number on EPIC WABA
  const regResult = await registerPhoneNumber(did, businessName.slice(0, 100))
  if (!regResult.success || !regResult.phoneNumberId) {
    console.error('[provision-number] Meta registration failed:', regResult.error)
    return NextResponse.json({ error: regResult.error || 'Meta registration failed' }, { status: 502 })
  }
  const phoneNumberId = regResult.phoneNumberId

  // Verify the phone_number_id actually exists in Meta before proceeding
  const metaStatus = await getPhoneNumberStatus(phoneNumberId)
  if (!metaStatus) {
    console.error(`[provision-number] Meta returned phoneNumberId ${phoneNumberId} but it cannot be retrieved — aborting`)
    return NextResponse.json({ error: 'Meta registration returned an invalid phone number ID. Please try again.' }, { status: 502 })
  }

  // Guard against duplicate phoneNumberId
  const dupPhone = await prisma.tenantRegistry.findUnique({
    where: { waPhoneNumberId: phoneNumberId },
  }).catch(() => null)
  if (dupPhone) {
    return NextResponse.json({ error: 'Phone number ID collision', tenantId: dupPhone.tenantId }, { status: 409 })
  }

  // Step 4: Allocate container port
  let containerPort: number
  try {
    const result = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('tenant_port_seq')`
    containerPort = Number(result[0].nextval)
  } catch (err: any) {
    console.error('[provision-number] Port allocation failed:', err.message)
    return NextResponse.json({ error: 'Port allocation failed' }, { status: 503 })
  }

  // Step 5: Write tenantRegistry — WA_TOKEN = EPIC META_WA_TOKEN (we own the number)
  const tenantId = crypto.randomUUID()
  let tokenEncrypted: string
  try {
    tokenEncrypted = encryptToken(META_WA_TOKEN)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  await prisma.tenantRegistry.create({
    data: {
      tenantId,
      waPhoneNumberId: phoneNumberId,
      containerPort,
      tokenEncrypted,
      template,
      status: 'pending_otp',
      didNumber: did,
      magnusUserId: (magResult as any).magnusUserId || null,
      magnusSipId:  (magResult as any).magnusSipId  || null,
      magnusDidId:  (magResult as any).magnusDidId  || null,
    },
  })

  // Step 6: Trigger Meta OTP voice call to the DID
  const otpResult = await requestVerificationCode(phoneNumberId, 'VOICE')
  if (!otpResult.success) {
    console.error('[provision-number] OTP request failed:', otpResult.error)
    await prisma.tenantRegistry.update({
      where: { tenantId },
      data: { status: 'inactive' },
    }).catch(() => {})
    return NextResponse.json({ error: otpResult.error || 'OTP request failed — try again.' }, { status: 502 })
  }

  console.log(`[provision-number] OTP triggered: tenant=${tenantId} did=${did} phoneId=${phoneNumberId} port=${containerPort}`)
  return NextResponse.json({ ok: true, tenantId, status: 'pending_otp' }, { status: 202 })
}
