/**
 * POST /api/voice/otp-callback
 * Called by the Asterisk AGI script when Meta's OTP voice call is answered.
 * Receives the captured DTMF/TTS digits and submits them to Meta to verify the number.
 *
 * Handles two paths:
 *   - Path A (existing agents): looks up prisma.agent by didNumber
 *   - Path B (isola tenants): looks up tenantRegistry by didNumber, then calls OCMT
 *
 * Body: { did, digits, secret }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyPhoneNumber, activatePhoneNumber } from '@/app/lib/whatsapp-provision'
import { updateDIDDestinationToSIP } from '@/app/lib/magnus'
import { decryptToken } from '@/app/lib/crypto'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

const AGI_SECRET      = process.env.AGI_CALLBACK_SECRET || 'bff-agi-2026'
const OCMT_URL        = process.env.OCMT_URL            || 'http://66.118.37.12:4000'
const OCMT_AUTH_TOKEN = process.env.OCMT_AUTH_TOKEN     || ''
const BASE_URL        = process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { did, digits, secret } = await req.json()

    if (secret !== AGI_SECRET) {
      console.error('[OTP Callback] Invalid secret')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!did || !digits) {
      return NextResponse.json({ error: 'did and digits required' }, { status: 400 })
    }

    const cleanDigits = String(digits).replace(/\D/g, '').slice(0, 6)
    if (cleanDigits.length < 4) {
      return NextResponse.json({ error: 'Digits too short' }, { status: 400 })
    }

    console.log(`[OTP Callback] DID ${did} received digits: ${cleanDigits}`)

    // ── Path A: existing BFF agents ───────────────────────────────────────────
    const agent = await prisma.agent.findFirst({
      where: {
        didNumber: did,
        whatsappStatus: { in: ['pending_verification', 'not_connected'] },
      },
      include: { user: true },
    })

    if (agent) {
      const cfg = agent.config as any || {}
      const phoneNumberId = cfg.whatsapp?.pendingPhoneNumberId

      if (!phoneNumberId) {
        console.warn(`[OTP Callback] No pendingPhoneNumberId for agent ${agent.id}`)
        return NextResponse.json({ ok: true, note: 'No pending phone number ID' })
      }

      const result = await verifyPhoneNumber(phoneNumberId, cleanDigits)

      if (!result.success) {
        console.error(`[OTP Callback] Meta verification failed for ${did}:`, result.error)
        await prisma.agentActivity.create({
          data: {
            agentId: agent.id,
            type: 'whatsapp_provision',
            summary: `OTP verification failed: ${result.error}`,
            metadata: { did, digits: cleanDigits, error: result.error },
          },
        }).catch(() => null)
        return NextResponse.json({ ok: false, error: result.error })
      }

      // Step 4: Activate number for messaging (register with PIN — Cloud API requirement)
      const activateResult = await activatePhoneNumber(phoneNumberId)
      if (!activateResult.success) {
        console.warn(`[OTP Callback] Register step failed for ${did} — number verified but may not send messages:`, activateResult.error)
      } else {
        console.log(`[OTP Callback] Number +${did} registered and active for messaging`)
      }

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          whatsappNumber: did,
          whatsappPhone: did,
          whatsappStatus: 'connected',
          phoneStatus: 'active',
          config: {
            ...cfg,
            whatsapp: {
              ...cfg.whatsapp,
              pendingPhoneNumberId: undefined,
              phoneNumberId,
              number: did,
              activatedAt: new Date().toISOString(),
            },
            phoneNumberId,
          },
        },
      })

      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          type: 'whatsapp_provision',
          summary: `WhatsApp number +${did} activated successfully`,
          metadata: { did, phoneNumberId },
        },
      }).catch(() => null)

      console.log(`[OTP Callback] Agent ${agent.id} WhatsApp activated on +${did}`)

      if (agent.ownerPhone) {
        const display = did.length === 11
          ? `+1 (${did.slice(1, 4)}) ${did.slice(4, 7)}-${did.slice(7)}`
          : `+${did}`
        await sendWhatsAppMessage(
          agent.ownerPhone,
          `Your dedicated WhatsApp number is live!\n\n${display}\n\nCustomers can now message your agent directly on this number.`
        ).catch(() => null)
      }

      return NextResponse.json({ ok: true, did, phoneNumberId, activated: true })
    }

    // ── Path B: isola tenantRegistry ──────────────────────────────────────────
    const tenant = await prisma.tenantRegistry.findFirst({
      where: { didNumber: did, status: 'pending_otp' },
    }).catch(() => null)

    if (!tenant) {
      console.warn(`[OTP Callback] No pending provisioning for DID ${did}`)
      return NextResponse.json({ ok: true, note: 'No pending provisioning for this DID' })
    }

    const tenantResult = await verifyPhoneNumber(tenant.waPhoneNumberId, cleanDigits)

    if (!tenantResult.success) {
      console.error(`[OTP Callback] Meta verification failed for isola DID ${did}:`, tenantResult.error)
      return NextResponse.json({ ok: false, error: tenantResult.error })
    }

    // Step 4: Activate number for messaging (register with PIN — Cloud API requirement)
    const activateResult = await activatePhoneNumber(tenant.waPhoneNumberId)
    if (!activateResult.success) {
      console.warn(`[OTP Callback] Register step failed for isola DID ${did}:`, activateResult.error)
    } else {
      console.log(`[OTP Callback] Isola DID +${did} registered and active for messaging`)
    }

    // Switch DID routing from OTP capture context to live SIP routing
    if (tenant.magnusDidId && tenant.magnusSipId && tenant.magnusUserId && did) {
      await updateDIDDestinationToSIP(
        tenant.magnusDidId,
        tenant.magnusSipId,
        tenant.magnusUserId,
        did,
      ).catch((e: any) => console.warn('[OTP Callback] DID routing switch failed:', e.message))
    }

    // Update status and spin up OCMT container
    await prisma.tenantRegistry.update({
      where: { tenantId: tenant.tenantId },
      data: { status: 'provisioning' },
    })

    let waToken = ''
    try { waToken = decryptToken(tenant.tokenEncrypted) } catch { /* non-fatal */ }

    fetch(`${OCMT_URL}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': OCMT_AUTH_TOKEN,
      },
      body: JSON.stringify({
        tenantId:          tenant.tenantId,
        waPhoneNumberId:   tenant.waPhoneNumberId,
        waToken,
        template:          tenant.template,
        containerPort:     tenant.containerPort,
        healthCallbackUrl: `${BASE_URL}/api/provision`,
      }),
      signal: AbortSignal.timeout(30000),
    }).catch(err => console.error('[OTP Callback] OCMT call failed:', err.message))

    console.log(`[OTP Callback] Isola tenant ${tenant.tenantId} OTP verified for +${did} — OCMT called`)
    return NextResponse.json({ ok: true, tenantId: tenant.tenantId, activated: true })

  } catch (err: any) {
    console.error('[OTP Callback]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
