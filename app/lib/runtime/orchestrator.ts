// app/lib/runtime/orchestrator-v2.ts
// Phase 5: Integrated with Watch/Whisper/Takeover

import { prisma } from '@/app/lib/prisma'
import { executePlannedActions } from '@/app/lib/runtime/action-executor'
import { evaluatePolicy } from '@/app/lib/runtime/policy-gate'
import { loadRuntimeContext } from '@/app/lib/runtime/session-context'
import { selectWorker } from '@/app/lib/runtime/worker-router'
import { planCollectionsResponse } from '@/app/lib/runtime/workers/collections'
import { planCustomerResponse } from '@/app/lib/runtime/workers/customer'
import { planOwnerResponse } from '@/app/lib/runtime/workers/owner'
import { planSalesResponse } from '@/app/lib/runtime/workers/sales'
import { planSupportResponse } from '@/app/lib/runtime/workers/support'
import { 
  getActiveWatchSession, 
  handleOwnerCommand,
  forwardToOwner,
  checkEscalationTriggers,
} from '@/app/lib/runtime/watch-service'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'
import type { SessionKind, WorkerDecision } from '@/app/lib/runtime/types'

async function runWorker(kind: string, context: any): Promise<WorkerDecision> {
  switch (kind) {
    case 'owner': return planOwnerResponse(context)
    case 'support': return planSupportResponse(context)
    case 'sales': return planSalesResponse(context)
    case 'collections': return planCollectionsResponse(context)
    case 'customer': default: return planCustomerResponse(context)
  }
}

export async function orchestrateInboundMessage(input: {
  agent: any
  phone: string
  sessionType: SessionKind
  messageText: string
  contactId?: string | null
  isOwner?: boolean
}) {
  const { agent, phone, messageText, contactId, isOwner } = input
  
  // PHASE 5: Handle owner commands
  if (isOwner && agent.ownerPhone === phone) {
    const conversation = await prisma.conversation.findFirst({
      where: { agentId: agent.id },
      orderBy: { lastMessageAt: 'desc' },
    })
    
    if (conversation) {
      const commandResult = await handleOwnerCommand(agent.id, phone, messageText, conversation.id)
      if (commandResult.handled) {
        return { handled: true, mode: 'owner_command' }
      }
    }
  }
  
  // Load context
  let context = await loadRuntimeContext({ agent, phone, sessionType: input.sessionType, messageText, contactId })
  
  // PHASE 5: Check for escalation triggers
  const escalation = checkEscalationTriggers(messageText)
  if (escalation.shouldEscalate && agent.ownerPhone) {
    await prisma.conversation.update({
      where: { id: context.conversation.id },
      data: { sessionType: 'owner', escalationFlag: escalation.reason },
    })
    
    await sendWhatsAppMessage({
      to: agent.ownerPhone,
      text: `Escalation: ${escalation.reason} From: ${phone}`,
    })
    
    context = await loadRuntimeContext({ agent, phone, sessionType: 'owner', messageText, contactId })
  }
  
  // Check for active watch/takeover session
  const watchSession = await getActiveWatchSession(agent.id)
  
  // If in takeover mode and not owner, forward to owner
  if (watchSession?.mode === 'takeover' && !isOwner) {
    await forwardToOwner(watchSession.ownerPhone, phone, messageText)
    return { handled: true, mode: 'takeover' }
  }
  
  // Select and run worker
  const worker = selectWorker(context as any)
  const decision = await runWorker(worker, context)
  
  const firstAction = decision.actions[0] || { type: 'reply', requiresApproval: false, risk: 'low' }
  const policy = evaluatePolicy({
    approvalMode: context.agent.approvalMode || 'auto',
    action: firstAction,
    sessionType: context.sessionType,
  })
  
  // PHASE 5: Forward to owner if in watch mode
  if (watchSession?.mode === 'watch' && !isOwner) {
    await forwardToOwner(watchSession.ownerPhone, phone, messageText)
  }
  
  const enrichedAudit = decision.audit.map((entry, index) => ({
    ...entry,
    metadata: {
      ...(entry.metadata || {}),
      worker,
      policyMode: policy.mode,
      sessionType: context.sessionType,
      actionType: decision.actions[index]?.type || decision.actions[0]?.type || 'none',
      watchMode: watchSession?.mode || 'none',
    },
  }))
  
  await executePlannedActions({
    agent: context.agent,
    phone: context.phone,
    conversation: context.conversation,
    policyMode: policy.mode,
    actions: decision.actions,
    audit: enrichedAudit,
  })
  
  return { ...decision, handled: true }
}
