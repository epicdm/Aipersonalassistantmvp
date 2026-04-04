/**
 * POST /api/messenger/webhook
 * Handles incoming Facebook Messenger messages.
 * Routes through shared agent responder for AI responses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { logWebhook, markWebhookProcessed, markWebhookFailed } from '@/app/lib/webhook-log'
import { generateAgentResponse } from '@/app/lib/agent-responder'
import { buildKnowledgeContext } from '@/app/lib/knowledge'
import { sendMessengerMessage, parseMessengerWebhook } from '@/app/lib/messenger'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'epic-wa-2026'

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const logId = await logWebhook('messenger', body)

  try {
    const messages = parseMessengerWebhook(body)
    for (const msg of messages) {
      await handleMessengerMessage(msg)
    }
    await markWebhookProcessed(logId)
  } catch (err: any) {
    console.error('[Messenger webhook]', err.message)
    await markWebhookFailed(logId, err.message)
  }

  return NextResponse.json({ ok: true })
}

async function handleMessengerMessage(msg: {
  senderId: string
  recipientId: string
  text?: string
  postback?: { title: string; payload: string }
}) {
  const text = msg.text || msg.postback?.payload || msg.postback?.title
  if (!text) return

  // Find agent (simplified: first active agent)
  const agent = await prisma.agent.findFirst({
    where: { isActive: true, status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  if (!agent) return

  // Find or create contact by facebookPsid
  let contact = await prisma.contact.findFirst({
    where: { facebookPsid: msg.senderId },
  })
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: agent.userId,
        phone: '',
        facebookPsid: msg.senderId,
        name: msg.senderId,
        channel: 'messenger',
      },
    })
  }

  // Upsert agent-contact
  await prisma.agentContact.upsert({
    where: { agentId_contactId: { agentId: agent.id, contactId: contact.id } },
    create: { agentId: agent.id, contactId: contact.id, lastInboundAt: new Date() },
    update: { lastContactAt: new Date(), lastInboundAt: new Date() },
  })

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: { agentId: agent.id, contactId: contact.id, channel: 'messenger' },
  })
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: agent.userId,
        agentId: agent.id,
        contactId: contact.id,
        channel: 'messenger',
        sessionType: 'customer',
      },
    })
  }

  // Record inbound
  await prisma.whatsAppMessage.create({
    data: {
      agentId: agent.id,
      phone: msg.senderId,
      role: 'user',
      content: text,
      channel: 'messenger',
      sessionType: 'customer',
    },
  })

  // Get history
  const history = await prisma.whatsAppMessage.findMany({
    where: { agentId: agent.id, phone: msg.senderId, channel: 'messenger' },
    orderBy: { timestamp: 'asc' },
    take: 20,
  })

  // Generate AI response
  const knowledgeContext = await buildKnowledgeContext(agent.id, agent.config)
  const config = (agent.config as any) || {}
  const knowledge = config.knowledge || {}
  const systemPrompt = `You are ${agent.name}, an AI assistant responding on Facebook Messenger. ${knowledge.businessName ? `You work for ${knowledge.businessName}.` : ''} Keep responses friendly and conversational. ${knowledgeContext}`

  const { text: reply, escalated } = await generateAgentResponse(
    systemPrompt,
    history.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    })),
    text
  )

  // Record response
  await prisma.whatsAppMessage.create({
    data: {
      agentId: agent.id,
      phone: msg.senderId,
      role: 'assistant',
      content: reply,
      channel: 'messenger',
      sessionType: 'customer',
      escalationFlag: escalated ? 'escalation' : null,
    },
  })

  // Send via Messenger
  await sendMessengerMessage(msg.senderId, reply)

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: reply.slice(0, 180),
      status: escalated ? 'escalated' : 'active',
      escalationFlag: escalated ? 'human_required' : null,
    },
  }).catch(() => null)
}
