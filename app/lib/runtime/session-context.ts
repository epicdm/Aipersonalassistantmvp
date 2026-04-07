import { buildKnowledgeContext } from '@/app/lib/knowledge'
import { prisma } from '@/app/lib/prisma'
import type { RuntimeContext, SessionKind } from '@/app/lib/runtime/types'

type LoadRuntimeContextInput = {
  agent: { id: string; userId: string; config?: unknown }
  phone: string
  sessionType: SessionKind
  messageText: string
  contactId?: string | null
}

type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ConversationRecord = {
  id: string
  sessionType: SessionKind
}

export interface LoadedRuntimeContext extends RuntimeContext {
  conversation: ConversationRecord
  history: StoredMessage[]
  knowledgeContext: string
  phone: string
  messageText: string
  sessionType: SessionKind
}

async function ensureConversationContext(input: LoadRuntimeContextInput): Promise<ConversationRecord> {
  const existing = await prisma.conversation.findFirst({
    where: { agentId: input.agent.id, phone: input.phone, sessionType: input.sessionType },
    orderBy: { createdAt: 'desc' },
  })

  if (!existing) {
    return prisma.conversation.create({
      data: {
        userId: input.agent.userId,
        agentId: input.agent.id,
        contactId: input.contactId ?? null,
        phone: input.phone,
        channel: 'whatsapp',
        sessionType: input.sessionType,
        status: 'active',
        lastMessageAt: new Date(),
      },
    })
  }

  return prisma.conversation.update({
    where: { id: existing.id },
    data: {
      contactId: input.contactId ?? (existing as { contactId?: string | null }).contactId ?? null,
      lastMessageAt: new Date(),
      status: 'active',
    },
  })
}

async function buildRecentHistory(agentId: string, phone: string, sessionType: SessionKind) {
  return (await prisma.whatsAppMessage.findMany({
    where: { agentId, phone, sessionType },
    orderBy: { timestamp: 'asc' },
    take: 20,
  }).catch(() => [])) as StoredMessage[]
}

export async function loadRuntimeContext(input: LoadRuntimeContextInput): Promise<LoadedRuntimeContext> {
  const [conversation, history, knowledgeContext] = await Promise.all([
    ensureConversationContext(input),
    buildRecentHistory(input.agent.id, input.phone, input.sessionType),
    buildKnowledgeContext(input.agent.id, input.agent.config),
  ])

  return {
    agent: input.agent,
    conversation,
    history,
    knowledgeContext,
    phone: input.phone,
    messageText: input.messageText,
    sessionType: input.sessionType,
  }
}
