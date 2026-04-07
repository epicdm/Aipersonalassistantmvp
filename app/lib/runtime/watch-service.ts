// app/lib/runtime/watch-service.ts
// Phase 5: Owner Watch / Whisper / Takeover

import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

export type WatchMode = 'watch' | 'takeover'

/**
 * Check if owner has an active watch session for this agent
 */
export async function getActiveWatchSession(agentId: string): Promise<{ mode: WatchMode; ownerPhone: string } | null> {
  const session = await prisma.watchSession.findFirst({
    where: {
      agentId,
      endedAt: null,
    },
    orderBy: { startedAt: 'desc' },
  })
  
  if (!session) return null
  
  return {
    mode: session.mode as WatchMode,
    ownerPhone: session.ownerPhone,
  }
}

/**
 * Start watching - owner receives copy of all messages
 */
export async function startWatch(agentId: string, ownerPhone: string): Promise<void> {
  // End any existing session first
  await endWatch(agentId)
  
  await prisma.watchSession.create({
    data: {
      agentId,
      ownerPhone,
      mode: 'watch',
    },
  })
  
  // Notify owner
  await sendWhatsAppMessage({
    to: ownerPhone,
    text: '👁️ Watch mode ON. You will receive a copy of every customer message. Text "stop watching" to end.',
  })
}

/**
 * Start takeover - owner talks directly, AI stops
 */
export async function startTakeover(agentId: string, ownerPhone: string, conversationId: string): Promise<void> {
  // End any existing session first
  await endWatch(agentId)
  
  await prisma.watchSession.create({
    data: {
      agentId,
      ownerPhone,
      mode: 'takeover',
    },
  })
  
  // Update conversation to owner session type
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { sessionType: 'owner' },
  })
  
  // Notify owner
  await sendWhatsAppMessage({
    to: ownerPhone,
    text: '👋 Takeover mode ON. You are now talking directly to the customer. AI is paused. Text "resume agent" to hand back.',
  })
}

/**
 * End watch/takeover session
 */
export async function endWatch(agentId: string): Promise<void> {
  await prisma.watchSession.updateMany({
    where: {
      agentId,
      endedAt: null,
    },
    data: {
      endedAt: new Date(),
    },
  })
}

/**
 * Handle owner message during watch/takeover
 * Returns true if message was handled (should not process as normal)
 */
export async function handleOwnerCommand(
  agentId: string,
  ownerPhone: string,
  messageText: string,
  conversationId: string
): Promise<{ handled: boolean; isWhisper?: boolean }> {
  const lowerText = messageText.toLowerCase().trim()
  
  // Check for commands
  if (lowerText === 'watch') {
    await startWatch(agentId, ownerPhone)
    return { handled: true }
  }
  
  if (lowerText === 'stop watching' || lowerText === 'stop') {
    await endWatch(agentId)
    await sendWhatsAppMessage({
      to: ownerPhone,
      text: '👁️ Watch mode OFF. You will no longer receive message copies.',
    })
    return { handled: true }
  }
  
  if (lowerText === 'take over' || lowerText === 'takeover') {
    await startTakeover(agentId, ownerPhone, conversationId)
    return { handled: true }
  }
  
  if (lowerText === 'resume agent' || lowerText === 'resume') {
    await endWatch(agentId)
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { sessionType: 'customer' },
    })
    await sendWhatsAppMessage({
      to: ownerPhone,
      text: '✅ AI agent resumed. The customer will receive AI responses again.',
    })
    return { handled: true }
  }
  
  // Check for whisper (prefix with !)
  if (messageText.startsWith('!')) {
    await prisma.whisperMessage.create({
      data: {
        conversationId,
        agentId,
        content: messageText.slice(1).trim(),
      },
    })
    await sendWhatsAppMessage({
      to: ownerPhone,
      text: '📝 Whisper recorded. Customer will not see this.',
    })
    return { handled: true, isWhisper: true }
  }
  
  // Check if we're in takeover mode - if so, forward to customer
  const session = await getActiveWatchSession(agentId)
  if (session?.mode === 'takeover') {
    // Don't handle here - let the normal flow forward to customer
    return { handled: false }
  }
  
  return { handled: false }
}

/**
 * Forward a copy of customer message to owner in watch mode
 */
export async function forwardToOwner(
  ownerPhone: string,
  customerPhone: string,
  messageText: string
): Promise<void> {
  await sendWhatsAppMessage({
    to: ownerPhone,
    text: `👁️ [${customerPhone}]: ${messageText}`,
  })
}

/**
 * Check if message should trigger auto-escalation
 */
export function checkEscalationTriggers(messageText: string): { shouldEscalate: boolean; reason?: string } {
  const lowerText = messageText.toLowerCase()
  
  // Negative sentiment keywords
  const negativeKeywords = ['angry', 'frustrated', 'terrible', 'worst', 'hate', 'scam', 'fraud', 'lawsuit', 'lawyer', 'complaint', 'manager', 'speak to human', 'talk to person', 'not a robot']
  
  for (const keyword of negativeKeywords) {
    if (lowerText.includes(keyword)) {
      return { shouldEscalate: true, reason: `Negative sentiment: "${keyword}"` }
    }
  }
  
  // Payment disputes
  const paymentKeywords = ['refund', 'chargeback', 'dispute', 'unauthorized charge', 'did not authorize', 'cancel payment']
  
  for (const keyword of paymentKeywords) {
    if (lowerText.includes(keyword)) {
      return { shouldEscalate: true, reason: `Payment dispute: "${keyword}"` }
    }
  }
  
  // Explicit human request
  const humanRequestKeywords = ['human', 'agent', 'representative', 'support person', 'real person', 'talk to someone']
  
  for (const keyword of humanRequestKeywords) {
    if (lowerText.includes(keyword)) {
      return { shouldEscalate: true, reason: `Human agent requested: "${keyword}"` }
    }
  }
  
  return { shouldEscalate: false }
}
