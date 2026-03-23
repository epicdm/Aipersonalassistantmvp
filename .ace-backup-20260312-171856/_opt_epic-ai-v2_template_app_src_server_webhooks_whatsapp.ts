// @ts-nocheck
/**
 * WhatsApp Webhook Handler — V2
 * Implements full 8-step routing decision tree from BFF-SPEC.md Section 7.1
 */
import type { Request, Response } from 'express'
import { prisma } from 'wasp/server'
import crypto from 'crypto'
import { buildKnowledgeContext } from '../knowledge'

const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'epic-wa-2026'
const WA_TOKEN = process.env.META_WA_TOKEN || ''
const PHONE_ID = process.env.META_PHONE_ID || '1003873729481088'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// ─── Webhook verification (GET) ───────────────────────────────

export const whatsappWebhookVerify = async (req: Request, res: Response, _context: any) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WA] Webhook verified')
    return res.status(200).send(challenge)
  }
  return res.status(403).send('Forbidden')
}

// ─── Send WhatsApp message ────────────────────────────────────

export async function sendWAMessage(to: string, text: string): Promise<string | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[WA] Send failed:', err)
      return null
    }
    const data = await res.json() as any
    return data?.messages?.[0]?.id ?? null
  } catch (e) {
    console.error('[WA] Send exception:', e)
    return null
  }
}

// ─── LLM call ────────────────────────────────────────────────

async function callLLM(systemPrompt: string, history: Array<{ role: string; content: string }>, userMessage: string): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ]

  // Try DeepSeek first
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 500 }),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const data = await res.json() as any
      return data.choices?.[0]?.message?.content || "I didn't quite get that. Can you try again?"
    }
  } catch (e) {
    console.warn('[LLM] DeepSeek failed, trying fallback')
  }

  // Fallback: OpenAI gpt-4o-mini
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 500 }),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const data = await res.json() as any
      return data.choices?.[0]?.message?.content || "I'll get back to you shortly."
    }
  } catch (e) {
    console.warn('[LLM] OpenAI fallback also failed')
  }

  return "I'm having a moment. Give me a second and try again! 🙏"
}

// ─── Build system prompt ──────────────────────────────────────

function buildSystemPrompt(agent: any, sessionType: 'owner' | 'customer', knowledgeContext = ''): string {
  const knowledge = agent.config?.knowledge || {}
  const businessName = knowledge.businessName || 'our business'
  const hours = knowledge.hours || 'business hours'
  const services = knowledge.services || ''
  const faq = knowledge.faq || ''
  const restrictions = knowledge.restrictions || ''
  const tone = agent.config?.tone || 'friendly and professional'

  const templatePrompts: Record<string, string> = {
    receptionist: `You are ${agent.name}, an AI receptionist for ${businessName}.
Your job: answer inquiries, take messages, book appointments, share hours/location/pricing.
Business hours: ${hours}
Services: ${services}
Common questions & answers: ${faq}
Tone: Professional, friendly, warm.
Always: If asked to book → collect name, contact, preferred time. Escalate if: payment question, complaint, urgent issue.
Never: ${restrictions || 'give medical/legal advice, share private business information'}`,

    sales: `You are ${agent.name}, an AI sales agent for ${businessName}.
Your job: qualify leads, follow up, send pricing, book demos, close deals.
Services/Products: ${services}
Common questions: ${faq}
Tone: Confident, persuasive, warm — not pushy.
Always: Ask qualifying questions. Move toward a booking or purchase. Escalate hot leads immediately.
Never: ${restrictions || 'make promises you cannot keep, share competitor information'}`,

    collections: `You are ${agent.name}, an AI collections agent for ${businessName}.
Your job: remind about overdue balances, offer payment plans, process payments, escalate stubborn accounts.
Business: ${businessName} | Hours: ${hours}
Tone: Firm but respectful. Never aggressive.
Always: Be empathetic. Offer a payment plan before escalating. Confirm payment received.
Never: ${restrictions || 'threaten legal action directly, share other customers\' account info'}`,

    concierge: `You are ${agent.name}, an AI concierge for ${businessName}.
Your job: handle reservations, answer guest questions, send confirmations, upsell experiences.
Details: ${services}
Common questions: ${faq}
Tone: Warm, attentive, premium — 5-star service energy.
Always: Anticipate needs. Confirm bookings. Share local tips when asked.
Never: ${restrictions || 'share other guests\' information, make bookings without confirming availability'}`,

    support: `You are ${agent.name}, an AI support agent for ${businessName}.
Your job: resolve tickets, answer product questions, escalate complex issues.
Services: ${services}
Common issues & resolutions: ${faq}
Tone: Patient, clear, helpful.
Always: Acknowledge the issue first. Give step-by-step help. Escalate if unresolved after 2 attempts.
Never: ${restrictions || 'promise refunds without authorization, access accounts without verification'}`,

    assistant: `You are ${agent.name}, a personal AI assistant.
Your job: manage reminders, track bills, handle to-dos, give a daily digest, help draft messages.
Tone: Warm, personal, like a trusted best friend.
Always: Be proactive. Remind before deadlines. Summarize clearly.
Never: ${restrictions || 'share personal information with others, make financial decisions without asking'}`,
  }

  const basePrompt = templatePrompts[agent.template] || `You are ${agent.name}, an AI assistant for ${businessName}. Be helpful, friendly, and concise.`
  const base = knowledgeContext
    ? `${basePrompt}\n\nKnowledge base:\n${knowledgeContext}\n\nIf the answer is not in the knowledge you have, say so plainly and offer the next best help. Do not invent business facts.`
    : basePrompt

  if (sessionType === 'owner') {
    return `${base}\n\nOWNER MODE: You are now speaking privately with the business owner. Be direct, factual, and helpful. Share stats when asked. Accept instructions and update your behaviour accordingly.`
  }

  return base
}

// ─── Owner command handlers ───────────────────────────────────

async function handleOwnerCommand(cmd: string, agent: any, ownerPhone: string): Promise<string | null> {
  const command = cmd.toLowerCase().trim()

  if (command === 'help') {
    const today = await prisma.whatsAppMessage.count({
      where: {
        agentId: agent.id,
        sessionType: 'customer',
        role: 'user',
        timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    })
    return `📋 *${agent.name} Commands*\n\n• *status* — current stats\n• *pause* — pause the agent\n• *resume* — resume the agent\n• *summary* — get a summary now\n• *stop* — disconnect this number\n• *help* — this message\n\n📊 Today so far: ${today} customer messages handled`
  }

  if (command === 'pause') {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'paused' } })
    return `⏸️ ${agent.name} is paused. Customers will see: "${agent.config?.awayMessage || "Hi! We're currently unavailable but will get back to you as soon as possible. 🙏"}"\n\nType *resume* to bring ${agent.name} back.`
  }

  if (command === 'resume') {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'active' } })
    return `▶️ ${agent.name} is back online 🟢`
  }

  if (command === 'status') {
    const today = await prisma.whatsAppMessage.count({
      where: { agentId: agent.id, sessionType: 'customer', role: 'user', timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    })
    const openEscalations = await prisma.agentActivity.count({
      where: { agentId: agent.id, type: 'escalation', resolved: false },
    })
    const statusEmoji = agent.status === 'active' ? '🟢' : agent.status === 'paused' ? '🟡' : '🔴'
    return `${statusEmoji} *${agent.name}* — ${agent.status}\n📊 ${today} messages today\n⚠️ ${openEscalations} open escalations`
  }

  if (command === 'stop') {
    await prisma.agent.update({ where: { id: agent.id }, data: { ownerPhone: null, status: 'draft' } })
    return `🔴 ${agent.name} has been disconnected. Your dashboard at bff.epic.dm shows how to reconnect.`
  }

  if (command === 'summary') {
    // Trigger immediate summary
    return await buildSummaryMessage(agent)
  }

  return null // not a command
}

async function buildSummaryMessage(agent: any): Promise<string> {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000) // last 2 hours
  const msgCount = await prisma.whatsAppMessage.count({
    where: { agentId: agent.id, sessionType: 'customer', role: 'user', timestamp: { gte: since } },
  })
  const openEscalations = await prisma.agentActivity.count({
    where: { agentId: agent.id, type: 'escalation', resolved: false },
  })
  const hotLead = await prisma.agentActivity.findFirst({
    where: { agentId: agent.id, type: 'escalation', resolved: false, summary: { contains: 'hot_lead' } },
    orderBy: { createdAt: 'desc' },
  })
  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  let msg = `🤖 *${agent.name} Update — ${now}*\n\n📊 Last 2 hours:\n• ${msgCount} messages handled\n• ${openEscalations} open escalations`
  if (hotLead) msg += `\n🔥 Hot lead: ${hotLead.summary}`
  msg += `\n\nReply here to give ${agent.name} instructions, or visit bff.epic.dm for the full dashboard.`
  return msg
}

// ─── Main webhook handler (POST) ─────────────────────────────

export const whatsappWebhook = async (req: Request, res: Response, _context: any) => {
  // Always ack immediately — Meta requires 200 within 5s
  res.status(200).send('OK')

  try {
    const body = req.body as any
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    if (!value?.messages?.length) return

    const msg = value.messages[0]
    const from: string = msg.from
    const metaMessageId: string = msg.id
    let messageText: string = ''

    // ── Step 0: Voice note transcription ─────────────────────
    if (msg.type === 'audio') {
      // TODO: transcribe via Whisper — for now pass through
      messageText = '[Voice message — transcription coming soon]'
    } else if (msg.type === 'text') {
      messageText = msg.text?.body || ''
    } else {
      // unsupported type — ignore
      return
    }

    if (!messageText.trim()) return

    // Dedup: skip if we already processed this Meta message ID
    if (metaMessageId) {
      const existing = await prisma.whatsAppMessage.findFirst({ where: { metaMessageId } })
      if (existing) return
    }

    // ── Step 1: Activation code? ──────────────────────────────
    const activationMatch = messageText.match(/BFF-([A-Z0-9]{10})/i)
    if (activationMatch) {
      const code = `BFF-${activationMatch[1].toUpperCase()}`
      const agent = await prisma.agent.findFirst({ where: { activationCode: code } })
      if (!agent) {
        await sendWAMessage(from, "❌ That code doesn't look right. Check your dashboard at bff.epic.dm for your activation code.")
        return
      }
      // Check expiry (24h from activationCodeCreatedAt)
      if (agent.activationCodeCreatedAt) {
        const expiresAt = new Date(agent.activationCodeCreatedAt.getTime() + 24 * 60 * 60 * 1000)
        if (new Date() > expiresAt) {
          await sendWAMessage(from, "⏰ This code has expired. Generate a new one at bff.epic.dm")
          return
        }
      }
      // Already activated by someone else?
      if (agent.ownerPhone && agent.ownerPhone !== from) {
        await sendWAMessage(from, "❌ This agent is already activated by another number.")
        return
      }
      // Bind owner phone
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          ownerPhone: from,
          activatedAt: new Date(),
          deployedAt: new Date(),
          status: 'active',
          onboardingStatus: 'in_progress',
          onboardingStep: 1,
        },
      })
      // Create owner conversation
      await prisma.conversation.upsert({
        where: { agentId_phone: { agentId: agent.id, phone: from } } as any,
        create: {
          agentId: agent.id,
          userId: agent.userId,
          phone: from,
          sessionType: 'owner',
          channel: 'whatsapp',
        },
        update: { lastMessageAt: new Date() },
      })
      // Send template-specific onboarding opener
      const openers: Record<string, string> = {
        receptionist: `Hi! I'm ${agent.name} 👋 I'm your new AI receptionist. What's your business called, and what services do you offer? I'll start handling your customer messages right away.`,
        sales: `Hey! I'm ${agent.name} 🎯 Ready to follow up on every lead so none go cold. What are you selling and where? I'll handle the first response.`,
        collections: `Hi! I'm ${agent.name} 📞 I'll help recover overdue payments. What's your company name, and how does your billing cycle work?`,
        concierge: `Hey! I'm ${agent.name} 🌴 Tell me about your property or venue — where is it, what are the house rules, and anything guests always ask?`,
        support: `Hi! I'm ${agent.name} 🎧 I'll handle your customer messages. What's your company name, and what are the most common issues customers contact you about?`,
        assistant: `Hey! I'm ${agent.name} ✨ Your personal assistant. What's the first thing you want me to help you stay on top of — reminders, bills, your schedule?`,
      }
      const opener = openers[agent.template] || `Hi! I'm ${agent.name} 👋 Tell me about your business and I'll get started right away.`
      await sendWAMessage(from, opener)
      return
    }

    // ── Step 2: Owner mode? ───────────────────────────────────
    const ownerAgent = await prisma.agent.findFirst({ where: { ownerPhone: from } })
    if (ownerAgent) {
      // Check if this is a reply to a summary message
      const replyToId = msg.context?.id
      if (replyToId) {
        const summary = await prisma.sentSummary.findFirst({ where: { metaMessageId: replyToId } })
        if (summary) {
          // Owner is replying to a summary — treat as instruction to agent
          await storeMessage(ownerAgent.id, from, 'user', messageText, 'owner', metaMessageId)
          const history = await getHistory(ownerAgent.id, from, 'owner')
          const knowledgeContext = await buildKnowledgeContext(ownerAgent.id, ownerAgent.config)
          const systemPrompt = buildSystemPrompt(ownerAgent, 'owner', knowledgeContext)
          const reply = await callLLM(systemPrompt, history, `[Owner instruction via summary reply]: ${messageText}`)
          const sentId = await sendWAMessage(from, reply)
          await storeMessage(ownerAgent.id, from, 'assistant', reply, 'owner', sentId || undefined)
          return
        }
      }

      // Check for commands first
      const commandReply = await handleOwnerCommand(messageText.trim(), ownerAgent, from)
      if (commandReply) {
        await sendWAMessage(from, commandReply)
        return
      }

      // Normal owner chat with their agent
      await storeMessage(ownerAgent.id, from, 'user', messageText, 'owner', metaMessageId)
      const history = await getHistory(ownerAgent.id, from, 'owner')
      const knowledgeContext = await buildKnowledgeContext(ownerAgent.id, ownerAgent.config)
      const systemPrompt = buildSystemPrompt(ownerAgent, 'owner', knowledgeContext)
      const reply = await callLLM(systemPrompt, history, messageText)
      const sentId = await sendWAMessage(from, reply)
      await storeMessage(ownerAgent.id, from, 'assistant', reply, 'owner', sentId || undefined)
      return
    }

    // ── Step 3: Returning customer? (48hr window) ─────────────
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const recentMessage = await prisma.whatsAppMessage.findFirst({
      where: { phone: from, sessionType: 'customer', timestamp: { gte: cutoff } },
      orderBy: { timestamp: 'desc' },
    })
    let routedAgent = recentMessage
      ? await prisma.agent.findUnique({ where: { id: recentMessage.agentId } })
      : null

    // ── Step 4: CHAT-{shareCode} routing ─────────────────────
    if (!routedAgent) {
      const chatMatch = messageText.match(/CHAT-([A-Z0-9]{12})/i)
      if (chatMatch) {
        const code = chatMatch[1].toUpperCase()
        routedAgent = await prisma.agent.findFirst({ where: { shareCode: code, status: 'active' } })
        if (!routedAgent) {
          await sendWAMessage(from, "👋 That link doesn't match an active business. Ask them to share a fresh link!")
          return
        }
      }
    }

    // ── Generic fallback ──────────────────────────────────────
    if (!routedAgent) {
      await sendWAMessage(from,
        "Hi! 👋 This number is powered by EPIC AI.\nIf a business shared this number with you, ask them for their direct chat link.\nWant to set up your own AI assistant? Visit bff.epic.dm 🚀"
      )
      return
    }

    // ── Step 5: doNotContact check ────────────────────────────
    const existingContact = await prisma.contact.findFirst({
      where: { phone: from, userId: routedAgent.userId },
    })
    if (existingContact?.doNotContact) {
      const lc = messageText.toLowerCase().trim()
      if (lc === 'start' || lc === 'subscribe') {
        await prisma.contact.update({ where: { id: existingContact.id }, data: { doNotContact: false, doNotContactAt: null } })
        await sendWAMessage(from, `You're back! ✅ ${routedAgent.name} is ready to help.`)
      }
      // Otherwise: do NOT reply, log only
      return
    }

    // Agent paused? Send away message
    if (routedAgent.status === 'paused') {
      const config = routedAgent.config as any
      const awayMsg = config?.awayMessage || "Hi! We're currently unavailable but will get back to you as soon as possible. 🙏"
      await sendWAMessage(from, awayMsg)
      return
    }

    // ── Step 6: Upsert Contact + Conversation ─────────────────
    const contact = await prisma.contact.upsert({
      where: { userId_phone: { userId: routedAgent.userId, phone: from } } as any,
      create: {
        userId: routedAgent.userId,
        primaryAgentId: routedAgent.id,
        phone: from,
        name: value?.contacts?.[0]?.profile?.name || null,
        channel: 'whatsapp',
      },
      update: {},
    })

    const conversation = await prisma.conversation.upsert({
      where: { agentId_phone: { agentId: routedAgent.id, phone: from } } as any,
      create: {
        agentId: routedAgent.id,
        userId: routedAgent.userId,
        contactId: contact.id,
        phone: from,
        sessionType: 'customer',
        channel: 'whatsapp',
        lastMessageAt: new Date(),
        lastMessagePreview: messageText.slice(0, 100),
      },
      update: {
        lastMessageAt: new Date(),
        lastMessagePreview: messageText.slice(0, 100),
        contactId: contact.id,
      },
    })

    // Upsert AgentContact join
    await prisma.agentContact.upsert({
      where: { agentId_contactId: { agentId: routedAgent.id, contactId: contact.id } },
      create: { agentId: routedAgent.id, contactId: contact.id, lastContactAt: new Date() },
      update: { lastContactAt: new Date() },
    })

    // ── Step 7: Insert WhatsAppMessage ────────────────────────
    await storeMessage(routedAgent.id, from, 'user', messageText, 'customer', metaMessageId)

    // ── Step 8: Free tier limit check ─────────────────────────
    const user = await prisma.user.findUnique({ where: { id: routedAgent.userId } })
    if (user?.plan === 'free') {
      const todayCount = await prisma.whatsAppMessage.count({
        where: {
          agentId: routedAgent.id,
          sessionType: 'customer',
          role: 'user',
          timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      })
      if (todayCount >= 50) {
        await sendWAMessage(from, "I'm at my message limit for today. I'll be back tomorrow! 🙏")
        return
      }
      if (todayCount === 48) {
        // Notify owner they're approaching limit
        if (routedAgent.ownerPhone) {
          await sendWAMessage(routedAgent.ownerPhone,
            `⚠️ ${routedAgent.name} has used 48/50 customer messages today on the free plan. Upgrade before you hit the limit → bff.epic.dm/upgrade`)
        }
      }
    }

    // ── LLM call (queue or immediate) ─────────────────────────
    await processMessage(routedAgent, from, messageText, conversation.id)

  } catch (err) {
    console.error('[WA Webhook] Error:', err)
  }
}

// ─── Helpers ─────────────────────────────────────────────────

async function storeMessage(
  agentId: string, phone: string, role: 'user' | 'assistant',
  content: string, sessionType: 'owner' | 'customer', metaMessageId?: string
) {
  await prisma.whatsAppMessage.create({
    data: { agentId, phone, role, content, sessionType, metaMessageId: metaMessageId || null },
  })
}

async function getHistory(agentId: string, phone: string, sessionType: 'owner' | 'customer') {
  const msgs = await prisma.whatsAppMessage.findMany({
    where: { agentId, phone, sessionType },
    orderBy: { timestamp: 'desc' },
    take: 10,
  })
  return msgs.reverse().map(m => ({ role: m.role, content: m.content }))
}

async function processMessage(agent: any, from: string, messageText: string, conversationId: string) {
  const history = await getHistory(agent.id, from, 'customer')
  const knowledgeContext = await buildKnowledgeContext(agent.id, agent.config)
  const systemPrompt = buildSystemPrompt(agent, 'customer', knowledgeContext)

  const reply = await callLLM(systemPrompt, history, messageText)

  // Detect escalation flags in the reply context
  const lowerMsg = messageText.toLowerCase()
  let escalationFlag: string | null = null
  if (/buy|purchase|price|how much|cost|sign up|ready to/.test(lowerMsg)) escalationFlag = 'hot_lead'
  else if (/angry|frustrated|terrible|awful|useless|this is ridiculous/.test(lowerMsg)) escalationFlag = 'negative_sentiment'
  else if (/pay|payment|invoice|billing|charge/.test(lowerMsg)) escalationFlag = 'payment_moment'
  else if (/speak to|talk to|call me|human|person|someone/.test(lowerMsg)) escalationFlag = 'call_request'

  const sentId = await sendWAMessage(from, reply)
  await storeMessage(agent.id, from, 'assistant', reply, 'customer', sentId || undefined)

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: reply.slice(0, 100),
      ...(escalationFlag ? { escalationFlag, status: 'escalated' } : {}),
    },
  })

  // Log intent to AgentActivity
  await prisma.agentActivity.create({
    data: {
      agentId: agent.id,
      conversationId,
      type: escalationFlag ? 'escalation' : 'intent',
      summary: escalationFlag ? `${escalationFlag}: ${messageText.slice(0, 80)}` : `Replied to customer`,
      metadata: escalationFlag ? { flag: escalationFlag } : {},
    },
  })

  // Notify owner of hot leads / escalations (Pro+ only)
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  if (escalationFlag && user?.plan !== 'free' && agent.ownerPhone) {
    const prefs = user?.notificationPrefs as any
    const alertTypes: string[] = prefs?.instantAlerts || ['hot_lead', 'negative_sentiment', 'payment_moment', 'call_request']
    if (alertTypes.includes(escalationFlag)) {
      const contact = await prisma.contact.findFirst({ where: { phone: from, userId: agent.userId } })
      const name = contact?.name || from
      const flagEmoji: Record<string, string> = {
        hot_lead: '🔥',
        negative_sentiment: '😠',
        payment_moment: '💰',
        call_request: '📞',
      }
      await sendWAMessage(
        agent.ownerPhone,
        `${flagEmoji[escalationFlag] || '⚠️'} *${flagEmoji[escalationFlag] ? escalationFlag.replace('_', ' ') : 'Alert'}* — ${name}\n"${messageText.slice(0, 120)}"\n\nView in dashboard: bff.epic.dm/inbox`
      )
    }
  }
}
