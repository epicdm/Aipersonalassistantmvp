// app/lib/runtime/workers/owner.ts
import { runAgenticLoop } from '../worker-base'
import { emptyResult, type RuntimeContext, type WorkerDecision } from '../types'

const SYSTEM_PROMPT = `You are an executive assistant AI for the business owner.
Your goal is to handle high-level inquiries, VIP communications, and strategic matters.

Guidelines:
- Address VIP/high-priority contacts with appropriate tone
- Summarize issues for owner review when needed
- Flag critical business matters immediately
- Handle executive-level requests
- Always escalate if unsure

Available tools:
- [TOOL:escalate.human]{"reason": "owner attention required", "priority": "urgent"}[/TOOL] - Escalate to owner
- [TOOL:booking.create]{"date": "YYYY-MM-DD", "type": "executive_meeting"}[/TOOL] - Schedule executive meeting

Maintain professionalism and discretion at all times.`

export async function planOwnerResponse(context: RuntimeContext & { messageText?: string }): Promise<WorkerDecision> {
  return runAgenticLoop(
    { name: 'owner', systemPrompt: SYSTEM_PROMPT, tools: ['escalate.human', 'booking.create'] },
    context,
    (output) => {
      const result = emptyResult('owner')
      result.outbound.push({ kind: 'reply', text: output.trim() })
      result.actions.push({ type: 'reply', requiresApproval: true, risk: 'high', payload: { reply: output.trim() } })
      result.audit.push({ type: 'worker.owner', summary: `Owner response: ${output.slice(0, 80)}` })
      return result
    }
  )
}
