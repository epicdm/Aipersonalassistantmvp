// app/lib/webhook/session-detector.ts
// Phase 2: extracted from app/api/whatsapp/webhook/route.ts
//
// Pure session resolution — no side-effects, no WhatsApp sends.
// Determines who is messaging (activation flow, owner, or customer)
// and which agent handles them.
import { prisma } from '@/app/lib/prisma'

export type SessionResult =
  | { kind: 'activation_code'; code: string; agent: any | null }
  | { kind: 'owner'; agent: any }
  | { kind: 'customer_chat_code'; agent: any; shareCode: string }
  | { kind: 'customer_chat_code_not_found' }
  | { kind: 'customer'; agent: any }
  | { kind: 'unknown' }

/**
 * Resolve what kind of session this inbound message represents.
 *
 * Call order mirrors the original processWebhook logic — do not reorder.
 * Called after: dedup check, onboarding keyword/button checks.
 */
export async function detectSession(
  from: string,
  text: string,
  _messageType: string,
  _rawMessage: any,
): Promise<SessionResult> {
  // 1. Activation code (BFF-XXXXXXXXXX)
  const activationMatch = text.match(/BFF-[A-Z0-9]{10}/i)
  if (activationMatch) {
    const code = activationMatch[0].toUpperCase()
    const agent = await prisma.agent
      .findFirst({ where: { activationCode: code } })
      .catch(() => null)
    return { kind: 'activation_code', code, agent }
  }

  // 2. Owner — phone matches an agent's ownerPhone
  const ownerAgent = await prisma.agent
    .findFirst({ where: { ownerPhone: from }, orderBy: { createdAt: 'desc' } })
    .catch(() => null)
  if (ownerAgent) {
    return { kind: 'owner', agent: ownerAgent }
  }

  // 3. Customer via CHAT-code shareable link
  const chatMatch = text.match(/CHAT-([A-Z0-9]{12})/i)
  if (chatMatch) {
    const shareCode = chatMatch[1].toUpperCase()
    const agent = await prisma.agent
      .findFirst({ where: { shareCode, status: { in: ['active', 'paused'] } } })
      .catch(() => null)
    if (!agent) return { kind: 'customer_chat_code_not_found' }
    return { kind: 'customer_chat_code', agent, shareCode }
  }

  // 4. Customer via most-recent open conversation
  const recentConversation = await prisma.conversation
    .findFirst({
      where: {
        phone: from,
        sessionType: 'customer',
        agent: { status: { in: ['active', 'paused'] } },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: { agent: true },
    })
    .catch(() => null)
  if (recentConversation?.agent) {
    return { kind: 'customer', agent: recentConversation.agent }
  }

  return { kind: 'unknown' }
}
