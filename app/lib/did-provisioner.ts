/**
 * DID Provisioner
 * SSH-based approach: queries Magnus MySQL directly and configures BFF Asterisk
 * Uses ssh2 to do everything server-side without relying on Magnus REST API
 */

import { Client as SSHClient } from 'ssh2'
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

// Magnus server (voice00.epic.dm)
const MAGNUS_SSH_HOST = process.env.MAGNUS_SSH_HOST || 'voice00.epic.dm'
const MAGNUS_SSH_USER = process.env.MAGNUS_SSH_USER || 'root'
const MAGNUS_SSH_PASS = process.env.MAGNUS_SSH_PASS || '2H5yJ6gMY3xrd33HjkKw'

// BFF Asterisk server
const BFF_SSH_HOST = process.env.BFF_SSH_HOST || '66.118.37.63'
const BFF_SSH_USER = process.env.BFF_SSH_USER || 'epicadmin'
const BFF_SSH_PASS = process.env.BFF_SSH_PASS || '1g4zrCGRZOLgpqpCsP6i'

const DID_DIALPLAN_FILE = '/etc/asterisk/extensions_magnus_did.conf'

export interface DIDProvisionResult {
  success: boolean
  didNumber?: string
  error?: string
}

// ─── SSH helper ─────────────────────────────────────────────────────────────

function sshExec(
  host: string,
  username: string,
  password: string,
  command: string,
  timeoutMs = 20000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient()
    let output = ''
    let timer: NodeJS.Timeout

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end()
          return reject(err)
        }
        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.stderr.on('data', (data: Buffer) => { output += data.toString() })
        stream.on('close', () => {
          clearTimeout(timer)
          conn.end()
          resolve(output.trim())
        })
      })
    })

    conn.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    timer = setTimeout(() => {
      conn.end()
      reject(new Error(`SSH timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    conn.connect({
      host,
      port: 22,
      username,
      password,
      readyTimeout: 10000,
      // Accept all host keys (internal servers)
      hostVerifier: () => true,
    })
  })
}

// ─── Find next available DID ─────────────────────────────────────────────────

async function findAvailableDID(): Promise<{ id: number; did: string } | null> {
  // Get DIDs already assigned in our DB so we don't conflict
  const agents = await prisma.agent.findMany({
    where: { didNumber: { not: null } },
    select: { didNumber: true },
  })
  const usedInDB = new Set(agents.map(a => a.didNumber!))

  // Query Magnus DB directly via SSH for an unassigned DID in our range
  const query = `
    SELECT d.id, d.did
    FROM pkg_did d
    LEFT JOIN pkg_did_destination dd ON dd.id_did = d.id
    WHERE d.did LIKE '1767818%'
    AND dd.id IS NULL
    ORDER BY d.did ASC
    LIMIT 20;
  `.replace(/\n/g, ' ').trim()

  const result = await sshExec(
    MAGNUS_SSH_HOST,
    MAGNUS_SSH_USER,
    MAGNUS_SSH_PASS,
    `mysql -u root mbilling -N -e "${query}"`,
    15000
  )

  // Parse tab-separated rows: id\tdid
  const lines = result.split('\n').filter(l => l.trim())
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 2) {
      const id = parseInt(parts[0].trim(), 10)
      const did = parts[1].trim()
      if (did && !usedInDB.has(did)) {
        return { id, did }
      }
    }
  }

  return null
}

// ─── Setup Magnus DID destination ────────────────────────────────────────────

async function setupMagnusDestination(didId: number, did: string): Promise<void> {
  // Check if destination already exists
  const checkQuery = `SELECT id FROM pkg_did_destination WHERE id_did = ${didId} LIMIT 1;`
  const existing = await sshExec(
    MAGNUS_SSH_HOST,
    MAGNUS_SSH_USER,
    MAGNUS_SSH_PASS,
    `mysql -u root mbilling -N -e "${checkQuery}"`,
    10000
  )

  if (existing.trim()) {
    console.log(`[DID Provisioner] Destination already exists for DID ${did}, skipping insert`)
    return
  }

  // Insert destination: route to bff-reg SIP trunk, dialplan type 10
  const insertQuery = `
    INSERT INTO pkg_did_destination (id_did, destination, voip_call, activated, priority)
    VALUES (${didId}, 'SIP/${did}@bff-reg', 10, 1, 1);
  `.replace(/\n/g, ' ').trim()

  await sshExec(
    MAGNUS_SSH_HOST,
    MAGNUS_SSH_USER,
    MAGNUS_SSH_PASS,
    `mysql -u root mbilling -e "${insertQuery}" && asterisk -rx "dialplan reload" 2>&1 | head -5`,
    15000
  )
}

// ─── Setup BFF Asterisk dialplan context ─────────────────────────────────────

async function setupBFFDialplan(did: string): Promise<void> {
  const context = `did-${did}`

  // Check if context already exists in the file
  const checkCmd = `grep -q '\\[${context}\\]' ${DID_DIALPLAN_FILE} && echo EXISTS || echo NOTFOUND`
  const checkResult = await sshExec(BFF_SSH_HOST, BFF_SSH_USER, BFF_SSH_PASS, checkCmd, 10000)

  if (checkResult.includes('EXISTS')) {
    console.log(`[DID Provisioner] Dialplan context [${context}] already exists, skipping`)
  } else {
    // Append dialplan context for this DID
    const dialplanBlock = [
      ``,
      `[${context}]`,
      `exten => _X.,1,NoOp(PSTN->WA: \${EXTEN})`,
      ` same => n,Dial(SIP/\${EXTEN}@bff-reg,30)`,
      ` same => n,Hangup()`,
    ].join('\\n')

    const appendCmd = `echo -e "${dialplanBlock}" | sudo tee -a ${DID_DIALPLAN_FILE}`
    await sshExec(BFF_SSH_HOST, BFF_SSH_USER, BFF_SSH_PASS, appendCmd, 15000)
    console.log(`[DID Provisioner] Added dialplan context [${context}]`)
  }

  // Reload dialplan on BFF Asterisk
  await sshExec(
    BFF_SSH_HOST,
    BFF_SSH_USER,
    BFF_SSH_PASS,
    `sudo asterisk -rx "dialplan reload" 2>&1 | head -3`,
    10000
  ).catch(e => console.warn('[DID Provisioner] Dialplan reload warning:', e.message))
}

// ─── Format DID for display ───────────────────────────────────────────────────

function formatDIDDisplay(did: string): string {
  // 17678180001 → +1 (767) 818-0001
  if (did.length === 11 && did.startsWith('1')) {
    const area = did.slice(1, 4)   // 767
    const prefix = did.slice(4, 7) // 818
    const line = did.slice(7)       // 0001
    return `+1 (${area}) ${prefix}-${line}`
  }
  return `+${did}`
}

// ─── Main provisioner ─────────────────────────────────────────────────────────

export async function provisionDID(
  agentId: string,
  whatsappPhone: string
): Promise<DIDProvisionResult> {
  try {
    console.log(`[DID Provisioner] Starting provisioning for agent ${agentId}`)

    // 1. Get agent from DB
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    })

    if (!agent) throw new Error(`Agent ${agentId} not found`)
    if (agent.didNumber && agent.phoneStatus === 'active') {
      console.log(`[DID Provisioner] Agent already has DID ${agent.didNumber}`)
      return { success: true, didNumber: agent.didNumber }
    }

    // 2. Find an available DID from Magnus DB
    const available = await findAvailableDID()
    if (!available) {
      throw new Error('No available DIDs in range 1767818XXXX — contact support')
    }

    const { id: didId, did: didNumber } = available
    console.log(`[DID Provisioner] Claiming DID ${didNumber} (id=${didId}) for agent ${agentId}`)

    // 3. Set up Magnus DID destination (route to BFF via SIP trunk)
    await setupMagnusDestination(didId, didNumber)

    // 4. Configure BFF Asterisk dialplan context for this DID
    await setupBFFDialplan(didNumber)

    // 5. Update agent in DB
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        didNumber,
        phoneNumber: didNumber,
        phoneStatus: 'active',
        config: {
          ...(agent.config as object || {}),
          voice: {
            didNumber,
            routing: 'bff-asterisk',
            provisionedAt: new Date().toISOString(),
          },
        },
      },
    })

    console.log(`[DID Provisioner] ✅ DID ${didNumber} provisioned for agent ${agentId}`)

    // 6. Send WhatsApp notification
    const displayNumber = formatDIDDisplay(didNumber)
    const targetPhone = whatsappPhone || agent.whatsappPhone || agent.user?.whatsappPhone
    if (targetPhone) {
      const msg = [
        `🎉 Your business number is ready!`,
        ``,
        `📞 Your number: ${displayNumber}`,
        ``,
        `Anyone who calls this number will reach you on WhatsApp. You can also:`,
        `• Set it to route to your AI agent`,
        `• Configure routing in your dashboard`,
        ``,
        `Welcome to Pro! 🚀`,
      ].join('\n')

      await sendWhatsAppMessage(targetPhone, msg).catch(e =>
        console.warn('[DID Provisioner] WhatsApp notification failed:', e.message)
      )
    }

    return { success: true, didNumber }
  } catch (error: any) {
    console.error('[DID Provisioner] Error:', error.message)
    return { success: false, error: error.message }
  }
}
