export type WorkerKind = 'customer' | 'owner' | 'support' | 'sales' | 'collections'

export type SessionKind = 'owner' | 'customer'

export type ActionRisk = 'low' | 'medium' | 'high'

export type PolicyMode = 'execute' | 'draft' | 'deny'

export type OutboundMessageKind = 'reply' | 'draft' | 'escalation'

export interface OutboundMessage {
  kind: OutboundMessageKind
  text: string
}

export interface PlannedAction {
  type: string
  requiresApproval: boolean
  risk?: ActionRisk
  payload?: Record<string, unknown>
}

export interface AuditEntry {
  type: string
  summary: string
  metadata?: Record<string, unknown>
}

export interface RuntimeContext {
  agent: unknown
  sessionType: SessionKind
  phone?: string
  messageText?: string
}

export interface WorkerDecision {
  worker: WorkerKind
  outbound: OutboundMessage[]
  actions: PlannedAction[]
  audit: AuditEntry[]
}

export interface OrchestratorResult extends WorkerDecision {}

export function emptyResult(worker: WorkerKind): OrchestratorResult {
  return {
    worker,
    outbound: [],
    actions: [],
    audit: [],
  }
}
