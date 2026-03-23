/**
 * BFF WhatsApp Webhook v2 — Full routing tree
 * Port 3016, uses V1 Prisma client
 */
import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Set env var for Prisma before importing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ocmt:ocmt_secure_2026@localhost:5432/bff'

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || 'postgresql://ocmt:ocmt_secure_2026@localhost:5432/bff'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const app = express()
app.use(cors())
app.use(express.json())

const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'epic-wa-2026'
const WA_TOKEN = process.env.META_WA_TOKEN || ''
const PHONE_ID = process.env.META_PHONE_ID || '1003873729481088'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bff-webhook-v2', ts: Date.now() }))

app.get('/api/whatsapp/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query
  if (mode === 'subscribe' && token === VERIFY_TOKEN) { console.log('[WA v2] Verified'); return res.status(200).send(challenge) }
  return res.sendStatus(403)
})

app.post('/api/whatsapp/webhook', async (req, res) => {
  res.sendStatus(200)
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (!msg) return
    const from = msg.from
    const text = (msg.text?.body || '').trim()
    console.log(`[WA v2] From ${from}: "${text}"`)

    // Step 1: Activation code (6-char uppercase alphanumeric)
    if (/^[A-Z0-9]{6}$/.test(text)) {
      const agent = await prisma.agent.findFirst({ where: { activationCode: text } })
      if (agent) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { status: 'active', activationCode: null, whatsappPhone: from, activatedAt: new Date() },
        })
        await sendWA(from, `✅ *${agent.name}* is now live!\n\nYour AI agent will handle customer messages. Text *help* for owner commands.`)
        return
      }
    }

    // Step 2: Owner mode
    const ownerAgent = await prisma.agent.findFirst({ where: { whatsappPhone: from, status: 'active' } })
    if (ownerAgent) {
      const cmd = text.toLowerCase()
      if (cmd === 'help') {
        await sendWA(from, `*${ownerAgent.name}* Owner Commands:\n\n*status* — view stats\n*pause* — pause agent\n*resume* — reactivate\n*mode auto* — auto reply\n*mode notify* — reply + alert\n*mode confirm* — draft only\n*inbox* — recent messages`)
        return
      }
      if (cmd === 'status') {
        const convs = await prisma.conversation.count({ where: { agentId: ownerAgent.id } })
        const msgs = await prisma.whatsAppMessage.count({ where: { agentId: ownerAgent.id, createdAt: { gte: new Date(Date.now() - 86400000) } } }).catch(() => 0)
        await sendWA(from, `📊 *${ownerAgent.name}*\nStatus: ${ownerAgent.status}\nConversations: ${convs}\nMessages today: ${msgs}\nMode: ${ownerAgent.approvalMode || 'auto'}`)
        return
      }
      if (cmd === 'pause') { await prisma.agent.update({ where: { id: ownerAgent.id }, data: { status: 'paused' } }); await sendWA(from, `⏸️ ${ownerAgent.name} paused.`); return }
      if (cmd === 'resume') { await prisma.agent.update({ where: { id: ownerAgent.id }, data: { status: 'active' } }); await sendWA(from, `▶️ ${ownerAgent.name} is back online!`); return }
      if (cmd.startsWith('mode ')) {
        const m = cmd.split(' ')[1]
        if (['auto','notify','confirm'].includes(m)) { await prisma.agent.update({ where: { id: ownerAgent.id }, data: { approvalMode: m } }); await sendWA(from, `✅ Mode set to *${m}*`); return }
      }
      if (cmd === 'inbox') {
        const recent = await prisma.conversation.findMany({ where: { agentId: ownerAgent.id }, orderBy: { updatedAt: 'desc' }, take: 5 })
        const lines = recent.map((c, i) => `${i+1}. ${c.phone} — ${new Date(c.updatedAt).toLocaleDateString()}`).join('\n')
        await sendWA(from, `📥 Recent:\n${lines || 'No conversations yet'}`)
        return
      }
    }

    // Step 3: Returning customer (48hr window)
    const recentConv = await prisma.conversation.findFirst({
      where: { phone: from, updatedAt: { gte: new Date(Date.now() - 172800000) } },
      orderBy: { updatedAt: 'desc' },
      include: { agent: true },
    }).catch(() => null)
    if (recentConv?.agent) { await handleCustomer(from, text, recentConv.agent, recentConv.id); return }

    // Step 4: Any previous conversation
    const anyConv = await prisma.conversation.findFirst({
      where: { phone: from },
      orderBy: { updatedAt: 'desc' },
      include: { agent: true },
    }).catch(() => null)
    if (anyConv?.agent) { await handleCustomer(from, text, anyConv.agent, anyConv.id); return }

    // No agent — welcome
    await sendWA(from, `👋 Hi! I'm Jenny, your AI assistant. Visit https://bff.epic.dm to set one up for your business!`)
  } catch (e) {
    console.error('[WA v2 Error]', e.message)
  }
})

async function handleCustomer(from, text, agent, convId) {
  if (agent.status === 'paused') {
    await sendWA(from, agent.awayMessage || "We're currently unavailable. We'll be back soon! 🙏")
    return
  }

  // Update conversation timestamp
  await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } }).catch(() => null)

  // Store inbound message
  await prisma.whatsAppMessage.create({
    data: { agentId: agent.id, conversationId: convId, from, to: PHONE_ID, direction: 'inbound', messageType: 'text', content: text },
  }).catch(e => console.error('[Store inbound]', e.message))

  // Get history
  const history = await prisma.whatsAppMessage.findMany({
    where: { conversationId: convId }, orderBy: { timestamp: 'asc' }, take: 15,
  }).catch(() => [])

  const systemPrompt = `You are ${agent.name}, an AI assistant.
${agent.description ? `About: ${agent.description}` : ''}
${agent.personality || 'Be friendly, helpful, and concise. Keep responses under 3 sentences.'}
If the customer needs a human agent, respond with ESCALATE in your reply.`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: text },
  ]

  let reply = `Thanks for reaching out! A team member will get back to you shortly.`
  try {
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 250 }),
    })
    const d = await r.json()
    reply = d.choices?.[0]?.message?.content?.trim() || reply
  } catch (e) {
    console.error('[LLM Error]', e.message)
  }

  const escalated = /ESCALATE/i.test(reply)
  if (escalated) {
    reply = reply.replace(/ESCALATE/gi, '').trim()
    if (agent.whatsappPhone) {
      await sendWA(agent.whatsappPhone, `🚨 *Escalation needed*\nCustomer: ${from}\nMessage: "${text}"`)
    }
  }

  // Store outbound
  await prisma.whatsAppMessage.create({
    data: { agentId: agent.id, conversationId: convId, from: PHONE_ID, to: from, direction: 'outbound', messageType: 'text', content: reply },
  }).catch(e => console.error('[Store outbound]', e.message))

  const mode = agent.approvalMode || 'auto'
  if (mode === 'confirm' && agent.whatsappPhone) {
    await sendWA(agent.whatsappPhone, `📝 Draft for ${from}:\n\n"${reply}"\n\nApprove? Text SEND ${from} to deliver.`)
    return
  }

  await sendWA(from, reply)

  if (mode === 'notify' && agent.whatsappPhone) {
    await sendWA(agent.whatsappPhone, `💬 ${from}: "${text.slice(0,60)}"\n→ "${reply.slice(0,60)}"`)
  }
}

async function sendWA(to, text) {
  if (!WA_TOKEN) { console.log(`[Mock→${to}] ${text}`); return }
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    })
    if (!r.ok) console.error('[WA Error]', await r.text())
  } catch (e) { console.error('[WA Send]', e.message) }
}

app.get('/api/agent/:id/status', async (req, res) => {
  try {
    const a = await prisma.agent.findUnique({ where: { id: req.params.id } })
    if (!a) return res.status(404).json({ error: 'Not found' })
    res.json({ id: a.id, name: a.name, status: a.status, activated: !!a.activatedAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const PORT = process.env.PORT || 3016
app.listen(PORT, () => console.log(`[BFF Webhook v2] Running on port ${PORT}`))
