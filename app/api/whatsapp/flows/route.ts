/**
 * POST /api/whatsapp/flows
 * WhatsApp Flows data endpoint. Receives encrypted payloads from Meta,
 * processes screen transitions, returns encrypted responses.
 *
 * Meta encrypts requests using AES-256-GCM with an RSA key exchange.
 * We decrypt with our private key, process, re-encrypt the response.
 *
 * Actions: INIT (first screen), data_exchange (screen transitions), COMPLETE (final submit)
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { alertEric } from '@/app/lib/alert'

export const dynamic = 'force-dynamic'

// Private key can be stored as PEM text or base64-encoded PEM
const FLOW_PRIVATE_KEY_RAW = process.env.FLOW_PRIVATE_KEY || ''
const FLOW_PRIVATE_KEY_B64 = process.env.FLOW_PRIVATE_KEY_B64 || ''
const FLOW_PRIVATE_KEY = FLOW_PRIVATE_KEY_RAW || (FLOW_PRIVATE_KEY_B64 ? Buffer.from(FLOW_PRIVATE_KEY_B64, 'base64').toString('utf8') : '')
const FLOW_PASSPHRASE  = process.env.FLOW_PASSPHRASE  || ''

// ── Encryption helpers (Meta WhatsApp Flows protocol) ───────────────────────

function decryptRequest(body: { encrypted_flow_data: string; encrypted_aes_key: string; initial_vector: string }) {
  const { encrypted_flow_data, encrypted_aes_key, initial_vector } = body

  // Decrypt the AES key using our RSA private key
  const privateKey = crypto.createPrivateKey({
    key: FLOW_PRIVATE_KEY,
    passphrase: FLOW_PASSPHRASE,
  })
  const decryptedAesKey = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encrypted_aes_key, 'base64')
  )

  // Decrypt the Flow data using AES-GCM
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64')
  const iv = Buffer.from(initial_vector, 'base64')

  // Last 16 bytes are the auth tag
  const authTag = flowDataBuffer.subarray(-16)
  const ciphertext = flowDataBuffer.subarray(0, -16)

  const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return { decryptedData: JSON.parse(decrypted.toString('utf8')), aesKey: decryptedAesKey, iv }
}

function encryptResponse(data: any, aesKey: Buffer, iv: Buffer): string {
  // Flip the IV for response encryption (Meta protocol requirement)
  const flippedIv = Buffer.alloc(iv.length)
  for (let i = 0; i < iv.length; i++) flippedIv[i] = ~iv[i] & 0xff

  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final(), cipher.getAuthTag()])
  return encrypted.toString('base64')
}

// ── Available DIDs cache ────────────────────────────────────────────────────

let didCache: { numbers: string[]; updatedAt: number } = { numbers: [], updatedAt: 0 }
const DID_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getAvailableDids(): Promise<string[]> {
  if (Date.now() - didCache.updatedAt < DID_CACHE_TTL && didCache.numbers.length > 0) {
    return didCache.numbers
  }

  try {
    // Fetch from the existing available-numbers route internally
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/api/isola/available-numbers`, {
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET || '' },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (data.numbers?.length) {
      // Filter out reserved DIDs
      const reserved = await prisma.pendingSignup.findMany({
        where: { reservedUntil: { gt: new Date() }, status: { in: ['flow_started', 'flow_complete', 'payment_pending'] } },
        select: { reservedDid: true },
      })
      const reservedSet = new Set(reserved.map(r => r.reservedDid))
      didCache = { numbers: data.numbers.filter((n: string) => !reservedSet.has(n)), updatedAt: Date.now() }
    }
  } catch (err: any) {
    console.error('[flows] DID cache refresh failed:', err.message)
  }

  return didCache.numbers
}

// ── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'isp', label: 'ISP / Telecom' },
  { id: 'retail', label: 'Retail / Shop' },
  { id: 'restaurant', label: 'Restaurant / Hospitality' },
  { id: 'medical', label: 'Medical / Dental' },
  { id: 'professional', label: 'Professional Services' },
  { id: 'collections', label: 'Collections' },
  { id: 'service', label: 'General Service Business' },
]

const PLANS = [
  { id: 'community', label: 'Community (Free)', price: '$0/mo', priceId: '' },
  { id: 'starter', label: 'Starter', price: '$49/mo', priceId: process.env.STRIPE_PRICE_STARTER || '' },
  { id: 'business', label: 'Business', price: '$99/mo', priceId: process.env.STRIPE_PRICE_BUSINESS || '' },
]

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!FLOW_PRIVATE_KEY) {
    console.error('[flows] FLOW_PRIVATE_KEY not configured')
    return NextResponse.json({ error: 'Flow endpoint not configured' }, { status: 500 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Plain-text health check (Meta may send unencrypted ping before encryption is set up)
  if (body.action === 'ping' && !body.encrypted_flow_data) {
    return NextResponse.json({ data: { status: 'active' } })
  }

  // Decrypt the request (Meta encrypts ALL real requests)
  let decryptedData: any, aesKey: Buffer, iv: Buffer
  try {
    ({ decryptedData, aesKey, iv } = decryptRequest(body))
  } catch (err: any) {
    console.error('[flows] Decryption failed:', err.message)
    // Return 421 to tell Meta client to re-download public key and retry
    return new NextResponse('Decryption failed', { status: 421 })
  }

  console.log('[flows] Decrypted action:', decryptedData.action, 'screen:', decryptedData.screen)

  // Health check ping from Meta (comes encrypted)
  if (decryptedData.action === 'ping') {
    const pingResponse = { version: decryptedData.version || '3.0', data: { status: 'active' } }
    const encrypted = encryptResponse(pingResponse, aesKey, iv)
    return new NextResponse(encrypted, { headers: { 'Content-Type': 'text/plain' } })
  }

  const { screen, data, action, flow_token, version } = decryptedData

  try {
    let response: any

    if (action === 'INIT') {
      // First screen load — generate flow_token, return template list
      const flowToken = crypto.randomUUID()
      const dids = await getAvailableDids()

      await prisma.pendingSignup.create({
        data: {
          flowToken,
          phone: data?.phone || 'unknown',
          status: 'flow_started',
        },
      })

      response = {
        screen: 'TEMPLATE',
        data: {
          flow_token: flowToken,
          templates: TEMPLATES,
          available_numbers: dids.slice(0, 5),
          plans: PLANS,
        },
      }
    } else if (action === 'data_exchange') {
      // Screen transition — save progress, return next screen data
      const signup = flow_token
        ? await prisma.pendingSignup.findUnique({ where: { flowToken: flow_token } })
        : null

      if (!signup) {
        response = { screen: 'ERROR', data: { error_message: 'Session expired. Please start over.' } }
      } else if (signup.status === 'abandoned' || (signup.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000)) {
        response = { screen: 'ERROR', data: { error_message: 'Session expired. Please start over.' } }
      } else {
        // Save whatever data came from the current screen
        const updateData: any = {}
        if (data?.template) updateData.template = data.template
        if (data?.business_name) updateData.businessName = data.business_name
        if (data?.email) updateData.email = data.email
        if (data?.plan) updateData.planId = data.plan
        if (data?.business_hours || data?.top_faqs) {
          updateData.businessData = {
            ...(signup.businessData as any || {}),
            hours: data.business_hours || (signup.businessData as any)?.hours,
            topFaqs: data.top_faqs || (signup.businessData as any)?.topFaqs,
          }
        }
        if (data?.selected_number) {
          updateData.reservedDid = data.selected_number
          updateData.reservedUntil = new Date(Date.now() + 10 * 60 * 1000) // 10-min reservation
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.pendingSignup.update({ where: { flowToken: flow_token }, data: updateData })
        }

        // Return data for the next screen
        const dids = await getAvailableDids()
        response = {
          screen: screen || 'NEXT',
          data: {
            flow_token,
            available_numbers: dids.slice(0, 5),
            plans: PLANS,
          },
        }
      }
    } else if (action === 'COMPLETE') {
      // Final submission — trigger provisioning or Stripe
      const signup = flow_token
        ? await prisma.pendingSignup.findUnique({ where: { flowToken: flow_token } })
        : null

      if (!signup) {
        response = { screen: 'ERROR', data: { error_message: 'Session expired.' } }
      } else {
        // Save final data
        const finalData: any = { status: 'flow_complete' }
        if (data?.template) finalData.template = data.template
        if (data?.business_name) finalData.businessName = data.business_name
        if (data?.email) finalData.email = data.email
        if (data?.plan) finalData.planId = data.plan
        if (data?.selected_number) {
          finalData.reservedDid = data.selected_number
          finalData.reservedUntil = new Date(Date.now() + 10 * 60 * 1000)
        }
        if (data?.business_hours || data?.top_faqs) {
          finalData.businessData = {
            ...(signup.businessData as any || {}),
            hours: data.business_hours,
            topFaqs: data.top_faqs,
          }
        }

        await prisma.pendingSignup.update({ where: { flowToken: flow_token }, data: finalData })

        // Trigger post-flow pipeline (runs async — don't block the Flow response)
        processFlowComplete(flow_token).catch(err => {
          console.error('[flows] Post-flow pipeline error:', err.message)
          alertEric(`Flow completion failed for ${flow_token}: ${err.message}`)
        })

        response = {
          screen: 'SUCCESS',
          data: {
            flow_token,
            message: signup.planId === 'community'
              ? 'Setting up your agent now...'
              : 'Almost there! Complete payment to activate your agent.',
          },
        }
      }
    } else {
      response = { screen: 'ERROR', data: { error_message: 'Unknown action' } }
    }

    // Encrypt and return as plain text (Meta expects encrypted base64 string)
    const encrypted = encryptResponse(response, aesKey, iv)
    return new NextResponse(encrypted, {
      headers: { 'Content-Type': 'text/plain' },
    })

  } catch (err: any) {
    console.error('[flows] Handler error:', err.message)
    const errorResponse = encryptResponse(
      { screen: 'ERROR', data: { error_message: 'Something went wrong. Please try again.' } },
      aesKey, iv
    )
    return new NextResponse(errorResponse, {
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

// ── Post-Flow Pipeline (async) ──────────────────────────────────────────────

async function processFlowComplete(flowToken: string): Promise<void> {
  const signup = await prisma.pendingSignup.findUniqueOrThrow({ where: { flowToken } })

  if (signup.planId === 'community' || !signup.planId) {
    // Free plan — provision immediately
    console.log('[flows] Free plan — provisioning directly:', flowToken)
    await triggerProvisioning(flowToken)
  } else {
    // Paid plan — create Stripe Checkout session, send payment link
    console.log('[flows] Paid plan — creating Stripe session:', flowToken)
    await createStripeSession(flowToken)
  }
}

async function createStripeSession(flowToken: string): Promise<void> {
  const signup = await prisma.pendingSignup.findUniqueOrThrow({ where: { flowToken } })
  const plan = PLANS.find(p => p.id === signup.planId)

  if (!plan?.priceId) {
    console.error('[flows] No price ID for plan:', signup.planId)
    await alertEric(`No Stripe price for plan ${signup.planId}, flow ${flowToken}`)
    return
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    customer_email: signup.email || undefined,
    metadata: { flow_token: flowToken },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/signup/success?flow_token=${flowToken}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/signup/cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h expiry
  })

  await prisma.pendingSignup.update({
    where: { flowToken },
    data: { stripeSessionId: session.id, status: 'payment_pending' },
  })

  // Send Stripe link via WhatsApp
  const { sendWhatsAppMessage } = await import('@/app/lib/whatsapp')
  await sendWhatsAppMessage(
    signup.phone,
    `Almost there! Tap to complete your ${plan.label} subscription (${plan.price}):\n\n${session.url}\n\nThis link expires in 24 hours.`
  )

  console.log('[flows] Stripe session created:', session.id, 'for', signup.phone)
}

async function triggerProvisioning(flowToken: string): Promise<void> {
  const signup = await prisma.pendingSignup.findUniqueOrThrow({ where: { flowToken } })

  await prisma.pendingSignup.update({ where: { flowToken }, data: { status: 'provisioning' } })

  try {
    // Call the existing provision-number route internally
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/api/isola/provision-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET || '',
      },
      body: JSON.stringify({
        did: signup.reservedDid,
        businessName: signup.businessName,
        template: signup.template || 'professional',
        email: signup.email,
        flowToken,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '(no body)')
      throw new Error(`Provision returned ${res.status}: ${err}`)
    }

    const result = await res.json()
    await prisma.pendingSignup.update({
      where: { flowToken },
      data: { tenantId: result.tenantId, status: 'provisioning' },
    })

    // Send progress message
    const { sendWhatsAppMessage } = await import('@/app/lib/whatsapp')
    await sendWhatsAppMessage(
      signup.phone,
      `Setting up your AI agent... This takes about 60 seconds. We'll message you when it's ready!`
    )

    console.log('[flows] Provisioning triggered:', flowToken, result.tenantId)
  } catch (err: any) {
    console.error('[flows] Provisioning failed:', err.message)
    await prisma.pendingSignup.update({
      where: { flowToken },
      data: { status: 'provision_failed', errorMessage: err.message },
    })
    await alertEric(`Provisioning failed for flow ${flowToken}: ${err.message}`)

    const { sendWhatsAppMessage } = await import('@/app/lib/whatsapp')
    await sendWhatsAppMessage(
      signup.phone,
      `We hit a snag setting up your agent. Our team has been notified and will reach out shortly. Sorry about that!`
    )
  }
}
