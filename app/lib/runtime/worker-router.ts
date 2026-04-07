import type { RuntimeContext, WorkerKind } from '@/app/lib/runtime/types'

export function selectWorker(context: Pick<RuntimeContext, 'sessionType' | 'agent'> & { agent: { template?: string | null } }): WorkerKind {
  if (context.sessionType === 'owner') return 'owner'

  switch (context.agent.template) {
    case 'support':
      return 'support'
    case 'sales':
      return 'sales'
    case 'collector':
    case 'collections':
      return 'collections'
    default:
      return 'customer'
  }
}
