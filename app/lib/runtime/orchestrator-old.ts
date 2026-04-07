import { executePlannedActions } from '@/app/lib/runtime/action-executor'
import { evaluatePolicy } from '@/app/lib/runtime/policy-gate'
import { loadRuntimeContext } from '@/app/lib/runtime/session-context'
import { selectWorker } from '@/app/lib/runtime/worker-router'
import { planCollectionsResponse } from '@/app/lib/runtime/workers/collections'
import { planCustomerResponse } from '@/app/lib/runtime/workers/customer'
import { planOwnerResponse } from '@/app/lib/runtime/workers/owner'
import { planSalesResponse } from '@/app/lib/runtime/workers/sales'
import { planSupportResponse } from '@/app/lib/runtime/workers/support'
import type { SessionKind, WorkerDecision } from '@/app/lib/runtime/types'

async function runWorker(kind: string, context: any): Promise<WorkerDecision> {
  switch (kind) {
    case 'owner':
      return planOwnerResponse(context)
    case 'support':
      return planSupportResponse(context)
    case 'sales':
      return planSalesResponse(context)
    case 'collections':
      return planCollectionsResponse(context)
    case 'customer':
    default:
      return planCustomerResponse(context)
  }
}

export async function orchestrateInboundMessage(input: {
  agent: any
  phone: string
  sessionType: SessionKind
  messageText: string
  contactId?: string | null
}) {
  const context = await loadRuntimeContext(input)
  const worker = selectWorker(context as any)
  const decision = await runWorker(worker, context)
  const firstAction = decision.actions[0] || { type: 'reply', requiresApproval: false, risk: 'low' }
  const policy = evaluatePolicy({
    approvalMode: context.agent.approvalMode || 'auto',
    action: firstAction,
    sessionType: context.sessionType,
  })

  const enrichedAudit = decision.audit.map((entry, index) => ({
    ...entry,
    metadata: {
      ...(entry.metadata || {}),
      worker,
      policyMode: policy.mode,
      sessionType: context.sessionType,
      actionType: decision.actions[index]?.type || decision.actions[0]?.type || 'none',
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

  return decision
}
