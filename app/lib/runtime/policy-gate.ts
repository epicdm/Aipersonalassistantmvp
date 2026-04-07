import type { ActionRisk, PolicyMode, PlannedAction, SessionKind } from '@/app/lib/runtime/types'

type ApprovalMode = 'auto' | 'confirm' | 'notify'

export interface PolicyDecision {
  allowed: boolean
  mode: PolicyMode
  reason?: string
}

export function classifyActionRisk(action: Pick<PlannedAction, 'type' | 'risk'>): ActionRisk {
  if (action.risk) return action.risk
  if (['payment_link', 'provision_number', 'billing_change'].includes(action.type)) return 'high'
  return 'low'
}

export function evaluatePolicy(input: {
  approvalMode: ApprovalMode
  action: PlannedAction
  sessionType?: SessionKind
}): PolicyDecision {
  const risk = classifyActionRisk(input.action)

  if (input.action.requiresApproval || risk === 'high') {
    return {
      allowed: false,
      mode: 'deny',
      reason: 'sensitive_action_requires_approval',
    }
  }

  if (input.approvalMode === 'confirm' && input.sessionType === 'customer') {
    return {
      allowed: true,
      mode: 'draft',
      reason: 'approval_required',
    }
  }

  if (input.approvalMode === 'notify') {
    return {
      allowed: true,
      mode: 'execute',
    }
  }

  return {
    allowed: true,
    mode: 'execute',
  }
}
