// app/lib/webhook/message-handler.ts
// Phase 2: all message-processing business logic extracted from
//          app/api/whatsapp/webhook/route.ts
//
// Exports for route.ts:
//   handleOnboardingButton   — onboarding interactive-button flows
//   handleOnboardingKeyword  — keyword-triggered onboarding menu
//   dispatchMessage          — routes a resolved SessionResult to the right handler
//
// Internal helpers (not exported) mirror the original private functions exactly
// to guarantee zero behaviour change.
import { prisma } from '@/app/lib/prisma'
import { buildKnowledgeContext } from '@/app/lib/knowledge'
import { extractKnowledge, getOnboardingOpener, TEMPLATE_QUESTIONS } from '@/app/lib/onboarding'
import {
  sendWhatsAppMessage,
  sendWhatsAppVoiceNote,
  sendInteractiveButtons,
} from '@/app/lib/whatsapp'
import { findOrCreateContact } from '@/app/lib/contacts'
import { orchestrateInboundMessage } from '@/app/lib/runtime/orchestrator'
import type { ParsedMessage } from './ingress'
import type { SessionResult } from './session-detector'
import { syncMessageToChatwoot } from './chatwoot-sync'

// ── Local types ───────────────────────────────────────────────────────────────

type SessionType = 'owner' | 'customer'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ── Tiny utilities (verbatim from original) ────────────────────────────────────

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
  return `Hi! I'm ${agent.name} \ud83d\udc4b Thanks for reaching out to ${businessName}. How can I help you today?`
}

function getAwayMessage(agent: any): string {
  const config = asObject(agent.config)
  return config.awayMessage || "Hi! We\u2019re currently unavailable but will get back to you as soon as possible. \ud83d\ude4f"
}

// buildSystemPrompt and callLLM are preserved for backward-compat
// (may be called by onboarding helpers that predate the orchestrator).
function buildSystemPrompt(agent: any, sessionType: SessionType, knowledgeContext: string): string {
  const config = asObject(agent.config)
  const knowledge = asObject(config.knowledge)
  const businessName = knowledge.businessName ? `You work for ${knowledge.businessName}.` : ''
  const language = config.language ? `Reply in ${config.language} unless the customer uses another language.` : ''
  const restrictions = knowledge.restrictions ? `Restrictions: ${knowledge.restrictions}` : ''
  const escalation =
    knowledge.escalation || knowledge.escalationTriggers
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
  ]
    .filter(Boolean)
    .join('\n')

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

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

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

// ── DB helpers ────────────────────────────────────────────────────────────────

async function ensureConversation(
  agent: any,
  phone: string,
  sessionType: SessionType,
  contactId?: string | null,
) {
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

async function recordMessage(
  agentId: string,
  phone: string,
  role: 'user' | 'assistant',
  content: string,
  sessionType: SessionType,
  metaMessageId?: string | null,
  escalationFlag?: string | null,
) {
  return prisma.whatsAppMessage
    .create({
      data: {
        agentId,
        phone,
        role,
        content,
        sessionType,
        metaMessageId: metaMessageId || null,
        escalationFlag: escalationFlag || null,
      },
    })
    .catch((error: any) => {
      console.error('[WA Store]', error?.message || error)
      return null
    })
}

const DAILY_FREE_LIMIT = 50
const DAILY_UPGRADE_WARN_AT = 48

async function maybeWarnUpgrade(agent: any, todayCount: number) {
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || undefined
  if (!agent.ownerPhone || todayCount < DAILY_UPGRADE_WARN_AT || todayCount >= DAILY_FREE_LIMIT)
    return

  const dayKey = new Date().toISOString().slice(0, 10)
  const existing = await prisma.agentActivity.findFirst({
    where: { agentId: agent.id, type: 'health', summary: `upgrade-threshold:${dayKey}` },
  })
  if (existing) return

  await prisma.agentActivity
    .create({
      data: {
        agentId: agent.id,
        type: 'health',
        summary: `upgrade-threshold:${dayKey}`,
        metadata: { todayCount, limit: DAILY_FREE_LIMIT },
      },
    })
    .catch(() => null)

  await sendWhatsAppMessage(
    agent.ownerPhone,
    `\u26a0\ufe0f You've used ${todayCount}/${DAILY_FREE_LIMIT} customer messages today on the free plan. Upgrade at bff.epic.dm/upgrade before you hit the limit.`,
    effectivePhoneId,
  )
}

// ── Core message handlers (verbatim logic, reorganised) ────────────────────────

async function handleOnboarding(
  from: string,
  text: string,
  agent: any,
  metaMessageId?: string | null,
  wasVoiceNote = false,
  phoneId?: string,
) {
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

  const wantsToFinish = /\b(ready|done|that'?s? ?(it|all)|skip|finish|let'?s? go)\b/i.test(text)
  const answeredRequired = questions
    .filter((q: any) => q.required)
    .every((q: any) => knowledge[q.key])
  const allAnswered = currentStep >= questions.length
  const isDone = allAnswered || (wantsToFinish && answeredRequired)

  if (isDone) {
    const history = await prisma.whatsAppMessage
      .findMany({
        where: { agentId: agent.id, phone: from, sessionType: owner,
    isOwner: true },
        orderBy: { timestamp: 'asc' },
        take: 30,
      })
      .catch(() => [] as any[])

    const transcript = history.map(
      (m: any) => `${m.role === 'user' ? 'Owner' : agent.name}: ${m.content}`,
    )
    const extracted = await extractKnowledge(transcript, agent.name)
    const mergedKnowledge = { ...knowledge, ...extracted }
    const mergedConfig = { ...config, knowledge: mergedKnowledge }

    const knowledgeSummary = Object.entries(mergedKnowledge)
      .filter(([, v]) => typeof v === 'string' && (v as string).trim())
      .slice(0, 8)
      .map(([k, v]) => `\u2022 ${k}: ${String(v).slice(0, 80)}`)
      .join('\n')

    const completionMsg = [
      `\u2705 Perfect! I'm fully set up and ready to go.\n`,
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

  const nextQuestion = questions[currentStep]
  const nextStep = currentStep + 1
  const answeredCount = Math.min(currentStep, questions.length)
  const progressNote = currentStep > 0 ? `(${answeredCount}/${questions.length})` : ''
  const questionMsg = progressNote ? `${progressNote} ${nextQuestion.question}` : nextQuestion.question
  const mergedConfig = { ...config, knowledge }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { onboardingStatus: 'in_progress', onboardingStep: nextStep, config: mergedConfig },
  })

  await recordMessage(agent.id, from, 'assistant', questionMsg, 'owner')
  await sendWhatsAppMessage(from, questionMsg, effectivePhoneId)
}

async function handleOwnerCommand(agent: any, command: string): Promise<boolean> {
  const effectivePhoneId = (agent.config as any)?.phoneNumberId || undefined
  const today = startOfToday()

  if (command === 'help') {
    await sendInteractiveButtons(
      agent.ownerPhone!,
      `Here are the commands for ${agent.name}. You can also type: summary, stop`,
      [
        { id: 'cmd_status', title: '\ud83d\udcca Status' },
        { id: 'cmd_pause', title: '\u23f8\ufe0f Pause' },
        { id: 'cmd_resume', title: '\u25b6\ufe0f Resume' },
      ],
      `${agent.name} Commands`,
      'Type help anytime',
    )
    return true
  }

  if (command === 'pause') {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'paused' } })
    await sendWhatsAppMessage(
      agent.ownerPhone!,
      `${agent.name} is paused. Customers will get your away message until you send resume.`,
      effectivePhoneId,
    )
    return true
  }

  if (command === 'resume') {
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'active' } })
    await sendWhatsAppMessage(agent.ownerPhone!, `${agent.name} is back online \ud83d\udfe2`, effectivePhoneId)
    return true
  }

  if (command === 'stop') {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { ownerPhone: null, status: 'draft' },
    })
    await sendWhatsAppMessage(
      agent.ownerPhone!,
      `Disconnected ${agent.name}. Generate a new activation code in the dashboard when you\u2019re ready to reconnect.`,
      effectivePhoneId,
    )
    return true
  }

  if (command === 'status' || command === 'summary') {
    const [todayMessages, hotLeads, escalations] = await Promise.all([
      prisma.whatsAppMessage.count({
        where: { agentId: agent.id, sessionType: 'customer', timestamp: { gte: today } },
      }),
      prisma.agentActivity
        .count({
          where: {
            agentId: agent.id,
            type: 'intent',
            createdAt: { gte: today },
            summary: { contains: 'hot_lead' },
          },
        })
        .catch(() => 0),
      prisma.agentActivity.count({
        where: { agentId: agent.id, type: 'escalation', createdAt: { gte: today } },
      }),
    ])

    await sendWhatsAppMessage(
      agent.ownerPhone!,
      `${agent.name} \u2014 ${agent.status === 'active' ? '\ud83d\udfe2 Live' : agent.status === 'paused' ? '\u23f8\ufe0f Paused' : '\u26aa Draft'}\n` +
        `\u2022 ${todayMessages} customer messages today\n` +
        `\u2022 ${hotLeads} hot leads\n` +
        `\u2022 ${escalations} escalations`,
      effectivePhoneId,
    )
    return true
  }

  return false
}

async function handleOwnerChat(
  agent: any,
  from: string,
  text: string,
  metaMessageId?: string | null,
  wasVoiceNote = false,
  phoneId?: string,
) {
  await recordMessage(agent.id, from, 'user', text, 'owner', metaMessageId)

  const result = await orchestrateInboundMessage({
    agent,
    phone: from,
    sessionType: owner,
    isOwner: true,
    messageText: text,
  })

  const reply = result.outbound[0]?.text
  if (!reply) return

  await recordMessage(agent.id, from, 'assistant', reply, 'owner')
  if (wasVoiceNote) {
    try {
      await sendWhatsAppVoiceNote(from, reply)
    } catch {}
  }
}

async function handleCustomer(
  agent: any,
  from: string,
  text: string,
  contactName?: string,
  metaMessageId?: string | null,
  wasVoiceNote = false,
  phoneId?: string,
) {
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
    await sendWhatsAppMessage(
      from,
      `Understood \u2014 you won\u2019t receive more messages from ${agent.name}. Reply START anytime to opt back in.`,
      effectivePhoneId,
    )
    if (agent.ownerPhone) {
      await sendWhatsAppMessage(
        agent.ownerPhone,
        `\ud83d\udd15 ${contact.name || from} opted out of ${agent.name}.`,
        effectivePhoneId,
      )
    }
    return
  }

  const conversation = await ensureConversation(agent, from, 'customer', contact.id)

  await prisma.conversation
    .update({
      where: { id: conversation.id },
      data: {
        contactId: contact.id,
        lastMessageAt: new Date(),
        lastMessagePreview: text.slice(0, 200),
        status: 'active',
      },
    })
    .catch(() => null)

  const userMsg = await recordMessage(agent.id, from, 'user', text, 'customer', metaMessageId)

  // ── Phase 3: mirror to Chatwoot operator console (fire-and-forget) ─────────
  syncMessageToChatwoot({
    agentId: agent.id,
    conversationId: conversation.id,
    messageId: userMsg?.id ?? '',
    from,
    contactName: contact.name ?? contactName,
    text,
    role: 'user',
    timestamp: new Date(),
    agentTemplate: agent.template,
  }).catch((e: any) => console.error('[chatwoot-sync]', e.message))
  // ── End Chatwoot sync ───────────────────────────────────────────────────────

  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const plan = user?.plan || 'free'
  const todayCount = await prisma.whatsAppMessage
    .count({
      where: {
        agentId: agent.id,
        sessionType: 'customer',
        role: 'user',
        timestamp: { gte: startOfToday() },
      },
    })
    .catch(() => 0)

  if (plan === 'free') {
    await maybeWarnUpgrade(agent, todayCount)
    if (todayCount >= DAILY_FREE_LIMIT) {
      await sendWhatsAppMessage(
        from,
        `We\u2019ve hit today\u2019s free plan message limit. Please try again later, or the owner can upgrade at bff.epic.dm/upgrade.`,
      )
      return
    }
  }

  if (agent.status === 'paused') {
    // NOTE: getAwayMessage takes 1 arg; effectivePhoneId here is the 3rd arg
    // of sendWhatsAppMessage that was accidentally passed as 2nd arg of
    // getAwayMessage in the original code. Preserved for zero-behaviour-change.
    await sendWhatsAppMessage(from, getAwayMessage(agent, effectivePhoneId))
    return
  }

  const result = await orchestrateInboundMessage({
    agent,
    phone: from,
    sessionType: 'customer',
    messageText: text,
    contactId: contact.id,
  })

  const reply = result.outbound[0]?.text
  const mode = agent.approvalMode || 'auto'
  const drafted = result.outbound[0]?.kind === 'draft' || mode === 'confirm'
  const escalated = result.audit.some((entry: any) => entry.type === 'escalation')

  if (reply && !drafted) {
    await recordMessage(
      agent.id,
      from,
      'assistant',
      reply,
      'customer',
      null,
      escalated ? 'escalation' : null,
    )
    if (wasVoiceNote) {
      try {
        await sendWhatsAppVoiceNote(from, reply)
      } catch {}
    }
  }

  await prisma.conversation
    .update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: reply
          ? drafted
            ? `[Draft] ${reply.slice(0, 180)}`
            : reply.slice(0, 180)
          : text.slice(0, 180),
        escalationFlag: escalated ? 'human_required' : null,
        status: escalated ? 'escalated' : 'active',
      },
    })
    .catch(() => null)

  if (drafted && reply && agent.ownerPhone) {
    await sendWhatsAppMessage(
      agent.ownerPhone,
      `\ud83d\udcdd Draft for ${contact.name || from}:\n\n${reply}\n\nReply in the dashboard to approve or edit.`,
      effectivePhoneId,
    )
  }

  if (escalated && agent.ownerPhone) {
    await sendWhatsAppMessage(
      agent.ownerPhone,
      `\ud83d\udea8 ${contact.name || from} needs human help.\n\nCustomer said: ${text}`,
      effectivePhoneId,
    )
  } else if (mode === 'notify' && agent.ownerPhone && reply) {
    await sendWhatsAppMessage(
      agent.ownerPhone,
      `\ud83d\udcac ${contact.name || from}: ${text.slice(0, 100)}\n\u2192 ${reply.slice(0, 100)}`,
      effectivePhoneId,
    )
  }
}

// ── Activation code handler ────────────────────────────────────────────────────

async function handleActivationCode(
  code: string,
  agent: any | null,
  from: string,
  incomingPhoneId: string,
) {
  if (!agent) {
    await sendWhatsAppMessage(
      from,
      'That activation code was not found. Generate a fresh one at bff.epic.dm and try again.',
      incomingPhoneId,
    )
    return
  }

  if (agent.activationCodeCreatedAt) {
    const expiresAt = new Date(agent.activationCodeCreatedAt.getTime() + 24 * 60 * 60 * 1000)
    if (expiresAt.getTime() < Date.now()) {
      await sendWhatsAppMessage(
        from,
        'This code has expired. Generate a new one at bff.epic.dm.',
        incomingPhoneId,
      )
      return
    }
  }

  if (agent.ownerPhone && agent.ownerPhone !== from) {
    await sendWhatsAppMessage(
      from,
      'This activation code has already been used on another phone. Generate a new one from the dashboard.',
      incomingPhoneId,
    )
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
}

// ── Onboarding interactive button handlers ────────────────────────────────────

const META_WA_TOKEN = process.env.META_WA_TOKEN || ''

/**
 * Handle an onboarding interactive button reply.
 * Returns true if the button was consumed (caller should stop).
 * Returns false if the btnId is not an onboarding button.
 */
export async function handleOnboardingButton(
  btnId: string,
  from: string,
  incomingPhoneId: string,
): Promise<boolean> {
  if (btnId === 'onboard_business') {
    await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_WA_TOKEN}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: from,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: "How would you like to set up?\n\n*Connect Facebook* \u2014 we'll import your business name, hours, and logo automatically (fastest)\n\n*Enter Manually* \u2014 type your business details in a quick form",
          },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'onboard_fb_connect', title: 'Connect Facebook' } },
              { type: 'reply', reply: { id: 'onboard_manual', title: 'Enter Manually' } },
            ],
          },
        },
      }),
    }).catch((e: any) => console.error('[WA] Business options failed:', e.message))
    console.log('[WA] Business onboarding path for:', from)
    return true
  }

  if (btnId === 'onboard_fb_connect') {
    await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_WA_TOKEN}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: from,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: {
            text: "Tap below to connect your Facebook account. We'll import your business details and send you a pre-filled form right here in WhatsApp.",
          },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: 'Connect with Facebook',
              url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/number`,
            },
          },
        },
      }),
    }).catch((e: any) => console.error('[WA] FB CTA failed:', e.message))
    console.log('[WA] Facebook connect for:', from)
    return true
  }

  if (btnId === 'onboard_manual') {
    const FLOW_ID = process.env.ISOLA_ONBOARDING_FLOW_ID
    if (FLOW_ID) {
      await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_WA_TOKEN}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'interactive',
          interactive: {
            type: 'flow',
            body: { text: 'Fill in your business details:' },
            action: {
              name: 'flow',
              parameters: {
                flow_message_version: '3',
                flow_id: FLOW_ID,
                flow_cta: 'Set Up Agent',
                flow_action: 'navigate',
                flow_action_payload: {
                  screen: 'TEMPLATE',
                  data: { greeting: 'Set up your AI business agent.' },
                },
              },
            },
          },
        }),
      }).catch((e: any) => console.error('[WA] Manual Flow failed:', e.message))
    }
    console.log('[WA] Manual entry for:', from)
    return true
  }

  if (btnId === 'onboard_personal') {
    const PERSONAL_FLOW_ID = process.env.ISOLA_PERSONAL_FLOW_ID
    if (PERSONAL_FLOW_ID) {
      await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_WA_TOKEN}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'interactive',
          interactive: {
            type: 'flow',
            body: { text: 'Set up your personal AI assistant in 1 minute.' },
            action: {
              name: 'flow',
              parameters: {
                flow_message_version: '3',
                flow_id: PERSONAL_FLOW_ID,
                flow_cta: 'Get Started',
                flow_action: 'navigate',
                flow_action_payload: {
                  screen: 'PERSONAL_INFO',
                  data: { greeting: 'Your personal AI assistant.' },
                },
              },
            },
          },
        }),
      }).catch((e: any) => console.error('[WA] Personal Flow failed:', e.message))
    } else {
      await sendWhatsAppMessage(
        from,
        'Personal assistant coming soon! For now, try setting up a business agent.',
        incomingPhoneId,
      )
    }
    console.log('[WA] Personal assistant path for:', from)
    return true
  }

  if (btnId === 'onboard_demo') {
    await sendWhatsAppMessage(
      from,
      'Welcome to the Isola demo! I\u2019m an AI agent for a sample business.\n\n' +
        'Try asking me anything a customer would ask:\n' +
        '\u2022 "What are your hours?"\n' +
        '\u2022 "Do you deliver?"\n' +
        '\u2022 "I want to place an order"\n\n' +
        "I'll respond like a real business agent. Send me a message!",
      incomingPhoneId,
    )
    console.log('[WA] Demo mode activated for:', from)
    return true
  }

  if (btnId === 'onboard_activate') {
    try {
      const pending = await prisma.pendingSignup.findFirst({
        where: { phone: from, status: { in: ['flow_complete', 'enriched'] } },
        orderBy: { createdAt: 'desc' },
      })
      if (pending) {
        await prisma.pendingSignup.update({
          where: { id: pending.id },
          data: { status: 'provisioning' },
        })
        await sendWhatsAppMessage(
          from,
          'Setting up your agent now... This takes about 60 seconds.',
          incomingPhoneId,
        )
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/api/isola/provision-number`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.INTERNAL_SECRET || '',
            },
            body: JSON.stringify({
              businessName: pending.businessName,
              template: pending.template || 'professional',
              email: pending.email,
              flowToken: pending.flowToken,
            }),
          },
        ).catch((e: any) => console.error('[WA] Provision trigger failed:', e.message))
      } else {
        await sendWhatsAppMessage(
          from,
          'No pending setup found. Message "signup" to start fresh.',
          incomingPhoneId,
        )
      }
    } catch (e: any) {
      console.error('[WA] Activation failed:', e.message)
    }
    return true
  }

  return false
}

/**
 * Send the Isola onboarding menu when a keyword matches.
 */
export async function handleOnboardingKeyword(
  from: string,
  contactName: string | undefined,
  incomingPhoneId: string,
): Promise<void> {
  try {
    await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_WA_TOKEN}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: from,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: `Hi ${contactName || 'there'}! Welcome to Isola \u2014 AI agents for your business.\n\nWhat are you looking for?`,
          },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'onboard_business', title: 'Business Agent' } },
              { type: 'reply', reply: { id: 'onboard_personal', title: 'Personal Assistant' } },
              { type: 'reply', reply: { id: 'onboard_demo', title: 'Try a Demo' } },
            ],
          },
        },
      }),
    })
    console.log('[WA] Sent onboarding menu to:', from)
  } catch (err: any) {
    console.error('[WA] Failed to send menu:', err.message)
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

/**
 * Route a fully-resolved session to the appropriate handler.
 * Called from route.ts after session detection.
 */
export async function dispatchMessage(
  session: SessionResult,
  parsed: ParsedMessage,
  text: string,
  wasVoiceNote: boolean,
): Promise<void> {
  const { from, incomingPhoneId, metaMessageId, contactName } = parsed

  switch (session.kind) {
    case 'activation_code': {
      await handleActivationCode(session.code, session.agent, from, incomingPhoneId)
      break
    }

    case 'owner': {
      const { agent } = session
      if (agent.onboardingStatus === 'in_progress') {
        await handleOnboarding(from, text, agent, metaMessageId, wasVoiceNote, incomingPhoneId)
        return
      }
      const command = text.trim().split(/\s+/)[0].toLowerCase()
      const handled = await handleOwnerCommand(agent, command)
      if (handled) return
      await handleOwnerChat(agent, from, text, metaMessageId, wasVoiceNote, incomingPhoneId)
      break
    }

    case 'customer_chat_code': {
      const { agent, shareCode } = session
      const contact = await findOrCreateContact(agent, from, contactName)
      await ensureConversation(agent, from, 'customer', contact.id)
      // If text is only the CHAT code — send greeting and stop
      if (text.replace(/\s+/g, '').toUpperCase() === `CHAT-${shareCode}`) {
        const greeting = greetingForAgent(agent)
        await recordMessage(agent.id, from, 'assistant', greeting, 'customer')
        await sendWhatsAppMessage(from, greeting, incomingPhoneId)
        return
      }
      await handleCustomer(agent, from, text, contactName, metaMessageId, wasVoiceNote, incomingPhoneId)
      break
    }

    case 'customer_chat_code_not_found': {
      await sendWhatsAppMessage(
        from,
        `I couldn't find that business. Please check the link and try again.`,
        incomingPhoneId,
      )
      break
    }

    case 'customer': {
      await handleCustomer(
        session.agent,
        from,
        text,
        contactName,
        metaMessageId,
        wasVoiceNote,
        incomingPhoneId,
      )
      break
    }

    case 'unknown':
    default: {
      await sendWhatsAppMessage(
        from,
        `Hi! I'm Jenny. Visit https://bff.epic.dm to create your own WhatsApp AI agent.`,
        incomingPhoneId,
      )
      break
    }
  }
}
