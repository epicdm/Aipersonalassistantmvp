/**
 * POST /api/instagram/webhook
 * Handles incoming Instagram DMs and story mentions.
 * Routes messages through the shared agent responder.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { logWebhook, markWebhookProcessed, markWebhookFailed } from '@/app/lib/webhook-log'
import { generateAgentResponse } from '@/app/lib/agent-responder'
import { buildKnowledgeContext } from '@/app/lib/knowledge'
import { sendInstagramMessage } from '@/app/lib/instagram'
import { touchInboundTimestamp } from '@/app/lib/whatsapp-templates'

export async function GET(req: NextRequest) {
  // Instagram webhook verification (same pattern as WhatsApp)
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
  const logId = await logWebhook('instagram', body)

  try {
    await processInstagramWebhook(body)
    await markWebhookProcessed(logId)
  } catch (err: any) {
    console.error('[IG webhook]', err.message)
    await markWebhookFailed(logId, err.message)
  }

  return NextResponse.json({ ok: true })
}

async function processInstagramWebhook(body: any) {
  for (const entry of body?.entry || []) {
    // Instagram DMs
    for (const event of entry?.messaging || []) {
      if (event.message?.text) {
        await handleInstagramDM(event)
      }
    }
  }
}

async function handleInstagramDM(event: any) {
  const senderId = event.sender?.id
  const recipientId = event.recipient?.id
  const text = event.message?.text
  if (!senderId || !text) return

  // Find agent by IG page connection (simplified: find first active agent)
  const agent = await prisma.agent.findFirst({
    where: { isActive: true, status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
  if (!agent) return

  // Find or create contact by instagramId
  let contact = await prisma.contact.findFirst({
    where: { instagramId: senderId },
  })
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: agent.userId,
        phone: '', // IG contacts may not have phone
        instagramId: senderId,
        name: senderId, // Will be updated when we can fetch IG profile
        channel: 'instagram',
      },
    })
  }

  // Upsert agent-contact relationship and touch inbound timestamp
  await prisma.agentContact.upsert({
    where: { agentId_contactId: { agentId: agent.id, contactId: contact.id } },
    create: { agentId: agent.id, contactId: contact.id, lastInboundAt: new Date() },
    update: { lastContactAt: new Date(), lastInboundAt: new Date() },
  })

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: { agentId: agent.id, contactId: contact.id, channel: 'instagram' },
  })
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: agent.userId,
        agentId: agent.id,
        contactId: contact.id,
        channel: 'instagram',
        sessionType: 'customer',
      },
    })
  }

  // Record inbound message
  await prisma.whatsAppMessage.create({
    data: {
      agentId: agent.id,
      phone: senderId,
      role: 'user',
      content: text,
      channel: 'instagram',
      sessionType: 'customer',
    },
  })

  // Get conversation history
  const history = await prisma.whatsAppMessage.findMany({
    where: { agentId: agent.id, phone: senderId, channel: 'instagram' },
    orderBy: { timestamp: 'asc' },
    take: 20,
  })

  // Generate AI response
  const knowledgeContext = await buildKnowledgeContext(agent.id, agent.config)
  const config = (agent.config as any) || {}
  const knowledge = config.knowledge || {}
  const systemPrompt = `You are ${agent.name}, an AI assistant responding on Instagram DM. ${knowledge.businessName ? `You work for ${knowledge.businessName}.` : ''} Keep responses conversational and appropriate for Instagram. ${knowledgeContext}`

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
      phone: senderId,
      role: 'assistant',
      content: reply,
      channel: 'instagram',
      sessionType: 'customer',
      escalationFlag: escalated ? 'escalation' : null,
    },
  })

  // Send response via Instagram
  await sendInstagramMessage(senderId, reply)

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
