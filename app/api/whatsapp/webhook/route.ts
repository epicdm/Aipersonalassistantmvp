import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { buildKnowledgeContext } from '@/app/lib/knowledge'
import { extractKnowledge, getOnboardingOpener, TEMPLATE_QUESTIONS } from '@/app/lib/onboarding'
import { transcribeVoiceNote } from "@/app/lib/transcribe"
import { sendWhatsAppMessage, sendTypingIndicator, sendWhatsAppVoiceNote, sendInteractiveButtons } from "@/app/lib/whatsapp"

const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'epic-wa-2026'
const WA_TOKEN = process.env.META_WA_TOKEN || ''
const PHONE_ID = process.env.META_PHONE_ID || '1003873729481088'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const DAILY_FREE_LIMIT = 50
const DAILY_UPGRADE_WARN_AT = 48
const WA_BASE_URL = `https://graph.facebook.com/v25.0/${PHONE_ID}/messages`

type SessionType = 'owner' | 'customer'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function greetingForAgent(agent: any): string {
  const config = asObject(agent.config)
  const knowledge = asObject(config.knowledge)
  const businessName = knowledge.businessName || agent.name
  return `Hi! I'm ${agent.name} 👋 Thanks for reaching out to ${businessName}. How can I help you today?`
}

function getAwayMessage(agent: any): string {
  const config = asObject(agent.config)
  return config.awayMessage || "Hi! We're currently unavailable but will get back to you as soon as possible. 🙏"
}

function buildSystemPrompt(agent: any, sessionType: SessionType, knowledgeContext: string): string {
  const config = asObject(agent.config)
  const knowledge = asObject(config.knowledge)
  const businessName = knowledge.businessName ? `You work for ${knowledge.businessName}.` : ''
  const language = config.language ? `Reply in ${config.language} unless the customer uses another language.` : ''
  const restrictions = knowledge.restrictions ? `Restrictions: ${knowledge.restrictions}` : ''
  const escalation = knowledge.escalation || knowledge.escalationTriggers
    ? `Escalate when: ${knowledge.escalation || knowledge.escalationTriggers}`
    : ''

  const baseRules = [
    `You are ${agent.name}, an AI WhatsApp assistant.`,
    businessName,
    language,
    restrictions,
    escalation,
    'Keep replies short and natural for WhatsApp.',
    'Use plain text only. No markdown tables.',
    knowledgeContext ? `Knowledge base:\n${knowledgeContext}` : '',
    'If the answer is not in the knowledge you have, say so plainly and offer the next best help. Do not invent business facts.',
  ].filter(Boolean).join('\n')

  if (sessionType === 'owner') {
    return [
      baseRules,
      'You are speaking with the business owner, not a customer.',
      'Be direct, operational, and useful. Help with setup, instructions, and quick status questions.',
      'If the owner gives new business facts, acknowledge them and suggest updating the knowledge base when helpful.',
    ].join('\n')
  }

  const template = agent.template || 'support'
  const templateRules: Record<string, string> = {
    receptionist: 'Be warm and professional. Capture intent clearly and ask one useful follow-up when needed.',
    sales: 'Be consultative, friendly, and focused on qualifying the lead without sounding pushy.',
    collections: 'Be respectful and solution-oriented. Never shame or threaten.',
    concierge: 'Be enthusiastic, specific, and locally helpful.',
    support: 'Be calm, step-by-step, and avoid jargon.',
    assistant: 'Be proactive and organized.',
  }

  return [
    baseRules,
    templateRules[template] || templateRules.support,
    'If a human is clearly needed, include the token ESCALATE once in the reply.',
  ].join('\n')
}

async function callLLM(messages: ChatMessage[], fallback: string): Promise<string> {
  if (!DEEPSEEK_KEY) return fallback

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 280,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[WA LLM]', err)
      return fallback
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content?.trim() || fallback
  } catch (error: any) {
    console.error('[WA LLM Error]', error?.message || error)
    return fallback
  }
}


async function ensureConversation(agent: any, phone: string, sessionType: SessionType, contactId?: string | null) {
  let conversation = await prisma.conversation.findFirst({
    where: { agentId: agent.id, phone, sessionType },
    orderBy: { createdAt: 'desc' },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: agent.userId,
        agentId: agent.id,
        contactId: contactId ?? null,
        phone,
        channel: 'whatsapp',
        sessionType,
        status: 'active',
        lastMessageAt: new Date(),
      },
    })
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        contactId: contactId ?? conversation.contactId,
        lastMessageAt: new Date(),
        status: 'active',
      },
    })
  }

  return conversation
}

async function recordMessage(agentId: string, phone: string, role: 'user' | 'assistant', content: string, sessionType: SessionType, metaMessageId?: string | null, escalationFlag?: string | null) {
  return prisma.whatsAppMessage.create({
    data: {
      agentId,
      phone,
      role,
      content,
      sessionType,
      metaMessageId: metaMessageId || null,
      escalationFlag: escalationFlag || null,
    },
  }).catch((error: any) => {
    console.error('[WA Store]', error?.message || error)
    return null
  })
}

async function maybeWarnUpgrade(agent: any, todayCount: number) {
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || undefined
  if (!agent.ownerPhone || todayCount < DAILY_UPGRADE_WARN_AT || todayCount >= DAILY_FREE_LIMIT) return

  const dayKey = new Date().toISOString().slice(0, 10)
  const existing = await prisma.agentActivity.findFirst({
    where: {
      agentId: agent.id,
      type: 'health',
      summary: `upgrade-threshold:${dayKey}`,
    },
  })

  if (existing) return

  await prisma.agentActivity.create({
    data: {
      agentId: agent.id,
      type: 'health',
      summary: `upgrade-threshold:${dayKey}`,
      metadata: { todayCount, limit: DAILY_FREE_LIMIT },
    },
  }).catch(() => null)

  await sendWhatsAppMessage(
    agent.ownerPhone,
    `⚠️ You've used ${todayCount}/${DAILY_FREE_LIMIT} customer messages today on the free plan. Upgrade at bff.epic.dm/upgrade before you hit the limit.`
  , effectivePhoneId)
}

async function findOrCreateContact(agent: any, phone: string, fallbackName?: string) {
  let contact = await prisma.contact.findFirst({
    where: { userId: agent.userId, phone },
  })

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: agent.userId,
        primaryAgentId: agent.id,
        name: fallbackName || phone,
        phone,
      },
    })
  }

  const agentContact = await prisma.agentContact.findFirst({
    where: { agentId: agent.id, contactId: contact.id },
  })

  if (!agentContact) {
    await prisma.agentContact.create({
      data: {
        id: crypto.randomUUID(),
        agentId: agent.id,
        contactId: contact.id,
      },
    }).catch(() => null)
  } else {
    await prisma.agentContact.update({
      where: { id: agentContact.id },
      data: { lastContactAt: new Date() },
    }).catch(() => null)
  }

  return contact
}

async function handleOnboarding(from: string, text: string, agent: any, metaMessageId?: string | null, wasVoiceNote = false, phoneId?: string) {
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || phoneId
  await ensureConversation(agent, from, 'owner', null)
  await recordMessage(agent.id, from, 'user', text, 'owner', metaMessageId)

  const template = agent.template || 'support'
  const questions = TEMPLATE_QUESTIONS[template] || TEMPLATE_QUESTIONS['support']
  const currentStep = agent.onboardingStep || 0
  const config = asObject(agent.config)
  const knowledge = asObject(config.knowledge)

  // Save the answer to the previous question
  if (currentStep > 0 && currentStep <= questions.length) {
    const prevQuestion = questions[currentStep - 1]
    if (prevQuestion) {
      knowledge[prevQuestion.key] = text
    }
  }

  // Check if owner wants to skip remaining questions
  const wantsToFinish = /\b(ready|done|that'?s? ?(it|all)|skip|finish|let'?s? go)\b/i.test(text)

  // Determine if we are done (answered all questions or owner said ready)
  const answeredRequired = questions.filter((q: any) => q.required).every((q: any) => knowledge[q.key])
  const allAnswered = currentStep >= questions.length
  const isDone = allAnswered || (wantsToFinish && answeredRequired)

  if (isDone) {
    // Extract structured knowledge from full conversation
    const history = await prisma.whatsAppMessage.findMany({
      where: { agentId: agent.id, phone: from, sessionType: 'owner' },
      orderBy: { timestamp: 'asc' },
      take: 30,
    }).catch(() => [] as any[])

    const transcript = history.map((m: any) => `${m.role === 'user' ? 'Owner' : agent.name}: ${m.content}`)
    const extracted = await extractKnowledge(transcript, agent.name)
    const mergedKnowledge = { ...knowledge, ...extracted }
    const mergedConfig = { ...config, knowledge: mergedKnowledge }

    // Build completion summary
    const knowledgeSummary = Object.entries(mergedKnowledge)
      .filter(([, v]) => typeof v === 'string' && (v as string).trim())
      .slice(0, 8)
      .map(([k, v]) => `• ${k}: ${String(v).slice(0, 80)}`)
      .join('\n')

    const completionMsg = [
      `✅ Perfect! I'm fully set up and ready to go.\n`,
      knowledgeSummary ? `Here's what I know:\n${knowledgeSummary}\n` : '',
      `\nI'll start handling your ${template === 'assistant' ? 'tasks' : 'customers'} right away. You can update my knowledge base anytime from the dashboard at bff.epic.dm`,
    ].join('')

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        onboardingStatus: 'complete',
        onboardingStep: questions.length,
        status: 'active',
        config: mergedConfig,
      },
    })

    await recordMessage(agent.id, from, 'assistant', completionMsg, 'owner')
    await sendWhatsAppMessage(from, completionMsg, effectivePhoneId)
    return
  }

  // Ask the next question
  const nextQuestion = questions[currentStep]
  const nextStep = currentStep + 1

  // Add progress indicator
  const answeredCount = Math.min(currentStep, questions.length)
  const progressNote = currentStep > 0 ? `(${answeredCount}/${questions.length})` : ''
  const questionMsg = progressNote ? `${progressNote} ${nextQuestion.question}` : nextQuestion.question

  const mergedConfig = { ...config, knowledge }

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      onboardingStatus: 'in_progress',
      onboardingStep: nextStep,
      config: mergedConfig,
    },
  })

  await recordMessage(agent.id, from, 'assistant', questionMsg, 'owner')
  await sendWhatsAppMessage(from, questionMsg, effectivePhoneId)
}

async function handleOwnerCommand(agent: any, command: string) {
  // Use agent's own phone ID if they connected via Embedded Signup
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || undefined
  const today = startOfToday()

  if (command === 'help') {
    await sendInteractiveButtons(
      agent.ownerPhone!,
      `Here are the commands for ${agent.name}. You can also type: summary, stop`,
      [
        { id: 'cmd_status', title: '📊 Status' },
        { id: 'cmd_pause', title: '⏸️ Pause' },
        { id: 'cmd_resume', title: '▶️ Resume' },
      ],
      `${agent.name} Commands`,
      'Type help anytime'
    )
    return true
  }

  if (command === 'pause') {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'paused' } })
    await sendWhatsAppMessage(agent.ownerPhone!, `${agent.name} is paused. Customers will get your away message until you send resume.`, effectivePhoneId)
    return true
  }

  if (command === 'resume') {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'active' } })
    await sendWhatsAppMessage(agent.ownerPhone!, `${agent.name} is back online 🟢`, effectivePhoneId)
    return true
  }

  if (command === 'stop') {
    await prisma.agent.update({ where: { id: agent.id }, data: { ownerPhone: null, status: 'draft' } })
    await sendWhatsAppMessage(agent.ownerPhone!, `Disconnected ${agent.name}. Generate a new activation code in the dashboard when you're ready to reconnect.`, effectivePhoneId)
    return true
  }

  if (command === 'status' || command === 'summary') {
    const [todayMessages, hotLeads, escalations] = await Promise.all([
      prisma.whatsAppMessage.count({
        where: { agentId: agent.id, sessionType: 'customer', timestamp: { gte: today } },
      }),
      prisma.agentActivity.count({
        where: { agentId: agent.id, type: 'intent', createdAt: { gte: today }, summary: { contains: 'hot_lead' } },
      }).catch(() => 0),
      prisma.agentActivity.count({
        where: { agentId: agent.id, type: 'escalation', createdAt: { gte: today } },
      }),
    ])

    await sendWhatsAppMessage(
      agent.ownerPhone!,
      `${agent.name} — ${agent.status === 'active' ? '🟢 Live' : agent.status === 'paused' ? '⏸️ Paused' : '⚪ Draft'}\n` +
        `• ${todayMessages} customer messages today\n` +
        `• ${hotLeads} hot leads\n` +
        `• ${escalations} escalations`
    , effectivePhoneId)
    return true
  }

  return false
}

async function handleOwnerChat(agent: any, from: string, text: string, metaMessageId?: string | null, wasVoiceNote = false, phoneId?: string) {
  // Use agent's own phone ID if they connected via Embedded Signup
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || phoneId
  await ensureConversation(agent, from, 'owner', null)
  await recordMessage(agent.id, from, 'user', text, 'owner', metaMessageId)

  const history = await prisma.whatsAppMessage.findMany({
    where: { agentId: agent.id, phone: from, sessionType: 'owner' },
    orderBy: { timestamp: 'asc' },
    take: 20,
  }).catch(() => [])

  const knowledgeContext = await buildKnowledgeContext(agent.id, agent.config)
  const reply = await callLLM([
    { role: 'system', content: buildSystemPrompt(agent, 'owner', knowledgeContext) },
    ...history.slice(-10).map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    })),
    { role: 'user', content: text },
  ], `Got it. I can help with status, setup, or customer handling for ${agent.name}.`)

  await recordMessage(agent.id, from, 'assistant', reply, 'owner')
  if (wasVoiceNote) {
    try { await sendWhatsAppVoiceNote(from, reply) } catch { await sendWhatsAppMessage(from, reply, effectivePhoneId) }
  } else {
    await sendWhatsAppMessage(from, reply, effectivePhoneId)
  }
}

async function handleCustomer(agent: any, from: string, text: string, contactName?: string, metaMessageId?: string | null, wasVoiceNote = false, phoneId?: string) {
  // Use agent's own phone ID if they connected via Embedded Signup
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || phoneId
  const contact = await findOrCreateContact(agent, from, contactName)

  if (contact.doNotContact) {
    if (/^(start|resume)$/i.test(text.trim())) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { doNotContact: false, doNotContactAt: null },
      })
    } else {
      return
    }
  }

  if (/^(stop|unsubscribe)$/i.test(text.trim())) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { doNotContact: true, doNotContactAt: new Date() },
    })

    await sendWhatsAppMessage(from, `Understood — you won't receive more messages from ${agent.name}. Reply START anytime to opt back in.`, effectivePhoneId)
    if (agent.ownerPhone) {
      await sendWhatsAppMessage(agent.ownerPhone, `🔕 ${contact.name || from} opted out of ${agent.name}.`, effectivePhoneId)
    }
    return
  }

  const conversation = await ensureConversation(agent, from, 'customer', contact.id)

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      contactId: contact.id,
      lastMessageAt: new Date(),
      lastMessagePreview: text.slice(0, 200),
      status: 'active',
    },
  }).catch(() => null)

  await recordMessage(agent.id, from, 'user', text, 'customer', metaMessageId)

  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const plan = user?.plan || 'free'
  const todayCount = await prisma.whatsAppMessage.count({
    where: {
      agentId: agent.id,
      sessionType: 'customer',
      role: 'user',
      timestamp: { gte: startOfToday() },
    },
  }).catch(() => 0)

  if (plan === 'free') {
    await maybeWarnUpgrade(agent, todayCount)
    if (todayCount >= DAILY_FREE_LIMIT) {
      await sendWhatsAppMessage(from, `We've hit today's free plan message limit. Please try again later, or the owner can upgrade at bff.epic.dm/upgrade.`)
      return
    }
  }

  if (agent.status === 'paused') {
    await sendWhatsAppMessage(from, getAwayMessage(agent, effectivePhoneId))
    return
  }

  const history = await prisma.whatsAppMessage.findMany({
    where: { agentId: agent.id, phone: from, sessionType: 'customer' },
    orderBy: { timestamp: 'asc' },
    take: 20,
  }).catch(() => [])

  const knowledgeContext = await buildKnowledgeContext(agent.id, agent.config)
  let reply = await callLLM([
    { role: 'system', content: buildSystemPrompt(agent, 'customer', knowledgeContext) },
    ...history.slice(-10).map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    })),
    { role: 'user', content: text },
  ], `Thanks for reaching out to ${agent.name}. How can I help?`)

  const escalated = /ESCALATE/i.test(reply)
  if (escalated) reply = reply.replace(/ESCALATE/gi, '').trim()

  const mode = agent.approvalMode || 'auto'
  if (mode === 'confirm' && agent.ownerPhone) {
    await prisma.messageDraft.create({
      data: {
        id: crypto.randomUUID(),
        agentId: agent.id,
        conversationId: conversation.id,
        draftText: reply,
        status: 'pending',
      },
    }).catch(() => null)

    await sendWhatsAppMessage(agent.ownerPhone, `📝 Draft for ${contact.name || from}:\n\n${reply}\n\nReply in the dashboard to approve or edit.`, effectivePhoneId)
  } else {
    await recordMessage(agent.id, from, 'assistant', reply, 'customer', null, escalated ? 'escalation' : null)
    if (wasVoiceNote) {
      try { await sendWhatsAppVoiceNote(from, reply) } catch { await sendWhatsAppMessage(from, reply, effectivePhoneId) }
    } else {
      await sendWhatsAppMessage(from, reply, effectivePhoneId)
    }
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: mode === 'confirm' ? `[Draft] ${reply.slice(0, 180)}` : reply.slice(0, 180),
      escalationFlag: escalated ? 'human_required' : null,
      status: escalated ? 'escalated' : 'active',
    },
  }).catch(() => null)

  if (escalated) {
    await prisma.agentActivity.create({
      data: {
        agentId: agent.id,
        conversationId: conversation.id,
        type: 'escalation',
        summary: `Customer ${contact.name || from} needs human help`,
        metadata: { phone: from, message: text },
      },
    }).catch(() => null)

    if (agent.ownerPhone) {
      await sendWhatsAppMessage(agent.ownerPhone, `🚨 ${contact.name || from} needs human help.\n\nCustomer said: ${text}`, effectivePhoneId)
    }
  } else if (mode === 'notify' && agent.ownerPhone) {
    await sendWhatsAppMessage(agent.ownerPhone, `💬 ${contact.name || from}: ${text.slice(0, 100, effectivePhoneId)}\n→ ${reply.slice(0, 100)}`)
  }
}

async function processWebhook(body: any) {
  const change = body?.entry?.[0]?.changes?.[0]?.value
  const message = change?.messages?.[0]
  if (!message) return

  // Extract which phone number received this message
  const incomingPhoneId: string = change?.metadata?.phone_number_id || process.env.META_PHONE_ID || '1003873729481088'

  // ── Isola multi-tenant routing ────────────────────────────────────────────
  // If this phone_number_id belongs to an isola tenant container, proxy the
  // raw webhook body to that container and stop processing here.
  // BFF's own agents (EPIC's personal/business users) are not in tenant_registry
  // and fall through to the existing logic below.
  {
    const tenant = await prisma.tenantRegistry.findUnique({
      where: { waPhoneNumberId: incomingPhoneId },
    }).catch(() => null)

    if (tenant) {
      if (tenant.status !== 'active') {
        console.log(`[WA] Tenant ${tenant.tenantId} not active (${tenant.status}) — dropping message`)
        return
      }
      try {
        const containerUrl = `http://66.118.37.12:${tenant.containerPort}/webhook`
        const res = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) {
          console.error(`[WA] tenant=${tenant.tenantId} container:${tenant.containerPort} returned ${res.status} — message dead-lettered`)
        }
      } catch (err: any) {
        console.error(`[WA] tenant=${tenant.tenantId} container:${tenant.containerPort} unreachable: ${err.message} — message dead-lettered`)
      }
      return  // Stop — tenant container handles response to customer
    }
  }
  // ── End multi-tenant routing ──────────────────────────────────────────────

  const from = String(message.from || '').trim()
  const metaMessageId = String(message.id || '') || null

  // Show native typing indicator
  if (metaMessageId) {
    await sendTypingIndicator(metaMessageId, incomingPhoneId)
  }
  const contactName = change?.contacts?.[0]?.profile?.name as string | undefined

  if (!from) return

  // Handle text messages directly
  let text = String(message.text?.body || '').trim()
  let wasVoiceNote = false

  // Handle interactive button replies (native WhatsApp buttons)
  if (!text && message.type === 'interactive') {
    const interactive = message.interactive
    if (interactive?.type === 'button_reply') {
      text = interactive.button_reply?.title || interactive.button_reply?.id || ''
      // Map button IDs to commands
      const btnId = interactive.button_reply?.id || ''
      if (btnId === 'cmd_status') text = 'status'
      else if (btnId === 'cmd_pause') text = 'pause'
      else if (btnId === 'cmd_resume') text = 'resume'
    } else if (interactive?.type === 'list_reply') {
      text = interactive.list_reply?.title || interactive.list_reply?.id || ''
    }
  }

  // Handle voice notes / audio messages
  if (!text && message.type === 'audio' && message.audio?.id) {
    console.log(`[WA] Voice note from ${from}, media ID: ${message.audio.id}`)
    const transcribed = await transcribeVoiceNote(message.audio.id)
    if (transcribed) {
      text = transcribed
      wasVoiceNote = true
      console.log(`[WA] Transcribed voice note: "${text.slice(0, 100)}"`)
    } else {
      // Transcription failed or unavailable
      await sendWhatsAppMessage(from, "I got your voice message! \ud83c\udf99\ufe0f Unfortunately I couldn't process it right now \u2014 please type your message instead.", incomingPhoneId)
      return
    }
  }

  // Handle image messages
  if (!text && message.type === 'image') {
    const caption = message.image?.caption || ''
    text = caption ? `[Image] ${caption}` : '[Image shared]'
  }

  // Handle document messages
  if (!text && message.type === 'document') {
    const filename = message.document?.filename || 'document'
    const caption = message.document?.caption || ''
    text = caption ? `[Document: ${filename}] ${caption}` : `[Document shared: ${filename}]`
  }

  // Handle location messages
  if (!text && message.type === 'location') {
    const lat = message.location?.latitude
    const lng = message.location?.longitude
    const locName = message.location?.name || ''
    text = locName ? `[Location: ${locName}]` : `[Location: ${lat}, ${lng}]`
  }

  // Handle sticker messages
  if (!text && message.type === 'sticker') {
    text = '[Sticker]'
  }

  if (!text) return

  // ── WhatsApp Flow trigger (onboarding keywords on EPIC's main number) ───
  const ONBOARDING_KEYWORDS = ['signup', 'sign up', 'get started', 'new agent', 'set up', 'setup', 'i want an agent', 'isola']
  const isMainNumber = incomingPhoneId === (process.env.META_PHONE_ID || '1003873729481088')
  if (isMainNumber && ONBOARDING_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
    const FLOW_ID = process.env.ISOLA_ONBOARDING_FLOW_ID
    if (FLOW_ID) {
      try {
        const META_TOKEN = process.env.META_WA_TOKEN || ''
        await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_TOKEN}` },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'interactive',
            interactive: {
              type: 'flow',
              body: { text: 'Set up your AI business agent in 2 minutes. Tap below to get started.' },
              action: {
                name: 'flow',
                parameters: {
                  flow_message_version: '3',
                  flow_id: FLOW_ID,
                  flow_cta: 'Get Started',
                  flow_action: 'navigate',
                  flow_action_payload: { screen: 'TEMPLATE', data: { phone: from } },
                },
              },
            },
          }),
        })
        console.log('[WA] Sent onboarding Flow to:', from)
        return // Flow handles the rest
      } catch (err: any) {
        console.error('[WA] Failed to send Flow:', err.message)
        // Fall through to normal agent handling
      }
    }
  }
  // ── End Flow trigger ──────────────────────────────────────────────────────

  const existing = metaMessageId
    ? await prisma.whatsAppMessage.findFirst({ where: { metaMessageId } }).catch(() => null)
    : null
  if (existing) return

  console.log(`[WA] ${from}: ${text}`)

  const activationMatch = text.match(/BFF-[A-Z0-9]{10}/i)
  if (activationMatch) {
    const code = activationMatch[0].toUpperCase()
    const agent = await prisma.agent.findFirst({ where: { activationCode: code } })

    if (!agent) {
      await sendWhatsAppMessage(from, 'That activation code was not found. Generate a fresh one at bff.epic.dm and try again.', incomingPhoneId)
      return
    }

    if (agent.activationCodeCreatedAt) {
      const expiresAt = new Date(agent.activationCodeCreatedAt.getTime() + 24 * 60 * 60 * 1000)
      if (expiresAt.getTime() < Date.now()) {
        await sendWhatsAppMessage(from, 'This code has expired. Generate a new one at bff.epic.dm.', incomingPhoneId)
        return
      }
    }

    if (agent.ownerPhone && agent.ownerPhone !== from) {
      await sendWhatsAppMessage(from, 'This activation code has already been used on another phone. Generate a new one from the dashboard.', incomingPhoneId)
      return
    }

    const activatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        ownerPhone: from,
        activatedAt: agent.activatedAt || new Date(),
        deployedAt: agent.deployedAt || new Date(),
        status: 'active',
        activationCode: null,
        onboardingStatus: agent.onboardingStatus === 'complete' ? 'complete' : 'in_progress',
        onboardingStep: agent.onboardingStatus === 'complete' ? agent.onboardingStep : 1,
      },
    })

    await ensureConversation(activatedAgent, from, 'owner', null)
    const opener = getOnboardingOpener(activatedAgent.template || 'support', activatedAgent.name)
    await recordMessage(activatedAgent.id, from, 'assistant', opener, 'owner')
    await sendWhatsAppMessage(from, opener, incomingPhoneId)
    return
  }

  const ownerAgent = await prisma.agent.findFirst({
    where: { ownerPhone: from },
    orderBy: { createdAt: 'desc' },
  })

  if (ownerAgent) {
    if (ownerAgent.onboardingStatus === 'in_progress') {
      await handleOnboarding(from, text, ownerAgent, metaMessageId, wasVoiceNote, incomingPhoneId)
      return
    }

    const command = text.trim().split(/\s+/)[0].toLowerCase()
    const handled = await handleOwnerCommand(ownerAgent, command)
    if (handled) return

    await handleOwnerChat(ownerAgent, from, text, metaMessageId, wasVoiceNote, incomingPhoneId)
    return
  }

  let routedAgent: any = null
  const chatMatch = text.match(/CHAT-([A-Z0-9]{12})/i)
  if (chatMatch) {
    const shareCode = chatMatch[1].toUpperCase()
    routedAgent = await prisma.agent.findFirst({
      where: { shareCode, status: { in: ['active', 'paused'] } },
    })

    if (!routedAgent) {
      await sendWhatsAppMessage(from, `I couldn't find that business. Please check the link and try again.`, incomingPhoneId)
      return
    }

    const contact = await findOrCreateContact(routedAgent, from, contactName)
    await ensureConversation(routedAgent, from, 'customer', contact.id)

    if (text.replace(/\s+/g, '').toUpperCase() === `CHAT-${shareCode}`) {
      const greeting = greetingForAgent(routedAgent)
      await recordMessage(routedAgent.id, from, 'assistant', greeting, 'customer')
      await sendWhatsAppMessage(from, greeting, incomingPhoneId)
      return
    }
  }

  if (!routedAgent) {
    const recentConversation = await prisma.conversation.findFirst({
      where: {
        phone: from,
        sessionType: 'customer',
        agent: { status: { in: ['active', 'paused'] } },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: { agent: true },
    })

    routedAgent = recentConversation?.agent || null
  }

  if (!routedAgent) {
    await sendWhatsAppMessage(from, `Hi! I'm Jenny. Visit https://bff.epic.dm to create your own WhatsApp AI agent.`, incomingPhoneId)
    return
  }

  await handleCustomer(routedAgent, from, text, contactName, metaMessageId, wasVoiceNote, incomingPhoneId)
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  // Verify Meta signature before processing
  const rawBody = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-hub-signature-256') || ''

  // Require signature — Meta always sends X-Hub-Signature-256
  if (!signature) {
    console.error('[WA webhook] Missing X-Hub-Signature-256 header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }
  const { verifyMetaSignature } = await import('@/app/lib/meta-verify')
  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('[WA webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  processWebhook(body).catch((error) => console.error('[WA webhook]', error))
  return NextResponse.json({ ok: true })
}
