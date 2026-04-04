/**
 * Full Auto-Provisioning Orchestrator
 * 
 * Called after Stripe payment succeeds (or manually from dashboard).
 * 
 * Steps:
 * 1. Provision DID from Magnus (SSH → picks next available 1767818XXXX)
 * 2. Set up Asterisk dialplan on voice00 for that DID
 * 3. Install AGI script on voice00 to capture Meta's OTP call
 * 4. Register the number on Meta WABA
 * 5. Trigger Meta to call the DID with OTP
 * 6. AGI captures digits → POSTs to /api/voice/otp-callback
 * 7. BFF submits code → number goes live
 */

import { prisma } from './prisma'
import { provisionDID } from './did-provisioner'
import { registerPhoneNumber, requestVerificationCode } from './whatsapp-provision'
import { sendWhatsAppMessage } from './whatsapp'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
const exec = promisify(execCb)

const MAGNUS_SSH_HOST = process.env.MAGNUS_SSH_HOST || 'voice00.epic.dm'
const MAGNUS_SSH_USER = process.env.MAGNUS_SSH_USER || 'root'
const MAGNUS_SSH_PASS = process.env.MAGNUS_SSH_PASS || '2H5yJ6gMY3xrd33HjkKw'
const AGI_SECRET      = process.env.AGI_CALLBACK_SECRET || 'bff-agi-2026'
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL || 'https://bff.epic.dm'

function sshExec(_host: string, user: string, _pass: string, cmd: string, timeoutMs = 20000): Promise<string> {
  // Uses system ssh binary so ~/.ssh/config ProxyJump rules are respected.
  // Base64-encodes the command so multiline scripts survive shell quoting.
  const host = process.env.MAGNUS_SSH_HOST || 'voice00.epic.dm'
  const b64 = Buffer.from(cmd).toString('base64')
  // Try key auth first; fall back to password via sshpass if available
  const passPrefix = _pass ? `sshpass -p '${_pass}' ` : ''
  const sshCmd = `${passPrefix}ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o PubkeyAuthentication=${_pass ? 'no' : 'yes'} -o PreferredAuthentications=${_pass ? 'password' : 'publickey'} ${user}@${host} "echo ${b64} | base64 -d | bash"`
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`SSH timeout after ${timeoutMs}ms`)), timeoutMs)
    exec(sshCmd).then(({ stdout, stderr }) => {
      clearTimeout(timer)
      resolve((stdout + stderr).trim())
    }).catch(err => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/**
 * Install AGI script on voice00.
 * Meta reads the OTP code aloud via TTS — we record the call, transcribe via Groq, extract digits.
 */
async function installAGIScript(did: string): Promise<void> {
  const agiPath = `/var/lib/asterisk/agi-bin/bff_otp_${did}.sh`
  const groqKey = process.env.GROQ_API_KEY || ''

  // Generate script from template stored on voice00 (or write fresh)
  const cmd = `
TEMPLATE='/var/lib/asterisk/agi-bin/bff_otp_template.sh'
if [ -f "$TEMPLATE" ]; then
  sed "s/__DID__/${did}/g; s/__GROQ_KEY__/${groqKey}/g" "$TEMPLATE" > '${agiPath}'
  chmod +x '${agiPath}'
  echo "AGI installed from template: ${agiPath}"
else
  echo "template not found"
fi`

  const result = await sshExec(MAGNUS_SSH_HOST, MAGNUS_SSH_USER, MAGNUS_SSH_PASS, cmd, 15000)
  if (result.includes('not found')) {
    throw new Error('AGI template not found on voice00. Please run setup first.')
  }
  console.log(`[AutoProvision] AGI installed for ${did}`)
}

/**
 * Add Asterisk dialplan context on voice00 to route Meta's call to the AGI script.
 * Meta calls the DID — Asterisk routes it to our AGI.
 */
async function installDialplanContext(did: string): Promise<void> {
  const context = `bff-otp-${did}`
  const agiScript = `bff_otp_${did}.sh`
  const dialplanFile = '/etc/asterisk/extensions_bff_otp.conf'

  // Create the file if it doesn't exist, add include in extensions.conf
  const cmd = `
touch '${dialplanFile}'
# Always write/replace bff-otp context with UNIQUEID recording filename
python3 - << 'PYEND'
import re, os
f = '${dialplanFile}'
txt = open(f).read() if os.path.exists(f) else ''
blk = '\n[${context}]\nexten => _X.,1,NoOp(BFF OTP capture for ${did})\n same => n,MixMonitor(/tmp/bff_otp_${did}_${UNIQUEID}.wav)\n same => n,AGI(${agiScript})\n same => n,Hangup()'
txt2 = re.sub(r'\n\[${context}\][^\[]*', '', txt)
open(f,'w').write(txt2.rstrip() + blk + '\n')
print('bff-otp context written')
PYEND
# Also add/replace did-<DID> context in Magnus routing file
python3 - << 'PYEND'
import re, os
f = '/etc/asterisk/extensions_magnus_did.conf'
txt = open(f).read() if os.path.exists(f) else ''
blk = '\n[did-${did}]\nexten => _X.,1,Goto(${context},${EXTEN},1)'
txt2 = re.sub(r'\n\[did-${did}\][^\[]*', '', txt)
open(f,'w').write(txt2.rstrip() + blk + '\n')
print('did context written')
PYEND

# Include the file from extensions.conf if not already included
if ! grep -q 'extensions_bff_otp.conf' /etc/asterisk/extensions.conf; then
  echo '#include extensions_bff_otp.conf' >> /etc/asterisk/extensions.conf
fi

# Reload dialplan
asterisk -rx 'dialplan reload' 2>&1 | head -3
echo "dialplan_done"`

  await sshExec(MAGNUS_SSH_HOST, MAGNUS_SSH_USER, MAGNUS_SSH_PASS, cmd, 20000)
}

/**
 * Update Magnus DID destination to point to the OTP dialplan context.
 */
async function pointDIDToOTPContext(did: string): Promise<void> {
  const context = `bff-otp-${did}`
  // Update the DID routing in Magnus DB to use our OTP context
  const query = `UPDATE pkg_did_destination dd
    JOIN pkg_did d ON d.id = dd.id_did
    SET dd.destination = 'Local/${did}@${context}'
    WHERE d.did = '${did}';`
  
  await sshExec(
    MAGNUS_SSH_HOST, MAGNUS_SSH_USER, MAGNUS_SSH_PASS,
    `mysql -u root mbilling -e "${query}" && asterisk -rx "dialplan reload" 2>&1 | head -2`,
    15000
  )
}

export interface AutoProvisionResult {
  success: boolean
  did?: string
  phoneNumberId?: string
  step?: string
  error?: string
}

/**
 * Main entry point — call this after Stripe checkout.session.completed.
 */
export async function autoProvisionWhatsApp(agentId: string): Promise<AutoProvisionResult> {
  let did: string | undefined
  let phoneNumberId: string | undefined

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    })
    if (!agent) return { success: false, error: 'Agent not found', step: 'lookup' }

    // Already fully provisioned
    if (agent.whatsappStatus === 'connected' && agent.whatsappNumber) {
      return { success: true, did: agent.whatsappNumber, step: 'already_done' }
    }

    console.log(`[AutoProvision] Starting for agent ${agentId} (${agent.name})`)

    // ── Step 1: Provision DID from Magnus ───────────────────────────────────
    await prisma.agent.update({ where: { id: agentId }, data: { whatsappStatus: 'provisioning', phoneStatus: 'provisioning' } })

    const didResult = await provisionDID(agentId, agent.ownerPhone || '')
    if (!didResult.success || !didResult.didNumber) {
      throw Object.assign(new Error(didResult.error || 'DID provisioning failed'), { step: 'did_provision' })
    }
    did = didResult.didNumber
    console.log(`[AutoProvision] DID provisioned: ${did}`)

    // ── Step 2: Install AGI + dialplan on voice00 ────────────────────────────
    await installAGIScript(did)
    await installDialplanContext(did)
    await pointDIDToOTPContext(did)
    console.log(`[AutoProvision] Asterisk AGI installed for ${did}`)

    // ── Step 3: Register number on Meta WABA ────────────────────────────────
    const displayName = ((agent.config as any)?.knowledge?.businessName || agent.name).slice(0, 100)
    const regResult = await registerPhoneNumber(did, displayName)

    if (!regResult.success || !regResult.phoneNumberId) {
      throw Object.assign(new Error(regResult.error || 'Meta registration failed'), { step: 'meta_register' })
    }
    phoneNumberId = regResult.phoneNumberId
    console.log(`[AutoProvision] Meta phone number ID: ${phoneNumberId}`)

    // Save pending state so OTP callback can find it
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        whatsappStatus: 'pending_verification',
        config: {
          ...(agent.config as object || {}),
          whatsapp: { pendingPhoneNumberId: phoneNumberId, number: did },
          phoneNumberId,
        },
      },
    })

    // ── Step 4: Trigger Meta OTP call ────────────────────────────────────────
    const otpResult = await requestVerificationCode(phoneNumberId, 'VOICE')
    if (!otpResult.success) {
      throw Object.assign(new Error(otpResult.error || 'OTP request failed'), { step: 'otp_request' })
    }
    console.log(`[AutoProvision] OTP call triggered for ${did}`)

    // Notify owner we're waiting
    if (agent.ownerPhone) {
      await sendWhatsAppMessage(
        agent.ownerPhone,
        `📞 Setting up your dedicated WhatsApp number +${did}...\n\nVerifying with WhatsApp now. This takes 1–2 minutes. You'll get a confirmation when it's ready.`
      ).catch(() => null)
    }

    await prisma.agentActivity.create({
      data: {
        agentId,
        type: 'whatsapp_provision',
        summary: `OTP requested for +${did} — waiting for Asterisk to capture`,
        metadata: { did, phoneNumberId, step: 'otp_pending' },
      },
    }).catch(() => null)

    return { success: true, did, phoneNumberId, step: 'otp_pending' }

  } catch (err: any) {
    console.error('[AutoProvision] Error:', err.message)

    await prisma.agent.update({
      where: { id: agentId },
      data: { whatsappStatus: 'not_connected', phoneStatus: 'error' },
    }).catch(() => null)

    await prisma.agentActivity.create({
      data: {
        agentId,
        type: 'whatsapp_provision',
        summary: `Provisioning failed: ${err.message}`,
        metadata: { did, phoneNumberId, error: err.message, step: err.step || 'unknown' },
      },
    }).catch(() => null)

    return { success: false, did, phoneNumberId, step: err.step || 'unknown', error: err.message }
  }
}

/**
 * Set up AGI + Asterisk dialplan on voice00 so Meta's OTP voice call is captured.
 * Call this BEFORE registerPhoneNumber() to ensure routing is ready when Meta calls.
 */
export async function setupOTPCapture(did: string): Promise<void> {
  await installAGIScript(did)
  await installDialplanContext(did)
  await pointDIDToOTPContext(did)
}
