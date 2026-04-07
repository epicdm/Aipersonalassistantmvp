// app/lib/runtime/workers/support.ts
import { runAgenticLoop } from '../worker-base'
import { emptyResult, type RuntimeContext, type WorkerDecision } from '../types'

const SYSTEM_PROMPT = `You are a technical support AI assistant.
Your goal is to help users troubleshoot technical issues and provide solutions.

Guidelines:
- Diagnose problems systematically
- Ask clarifying questions when needed
- Provide clear step-by-step solutions
- Escalate complex issues to human support
- Flag urgent issues (outages, security) for immediate escalation

Available tools:
- [TOOL:escalate.human]{"reason": "technical issue", "priority": "high"}[/TOOL] - Escalate to tech support
- [TOOL:send.template]{"template": "troubleshooting_guide"}[/TOOL] - Send help template

Respond with empathy and technical accuracy.`

export async function planSupportResponse(context: RuntimeContext & { messageText?: string }): Promise<WorkerDecision> {
  const text = context.messageText?.toLowerCase() || ''
  const isUrgent = text.includes('urgent') || text.includes('down') || text.includes('broken') || text.includes('error')
  
  return runAgenticLoop(
    { name: 'support', systemPrompt: SYSTEM_PROMPT, tools: ['escalate.human', 'send.template'] },
    context,
    (output) => {
      const result = emptyResult('support')
      result.outbound.push({ kind: 'reply', text: output.trim() })
      result.actions.push({ type: 'reply', requiresApproval: isUrgent, risk: isUrgent ? 'high' : 'medium', payload: { reply: output.trim() } })
      result.audit.push({ type: 'worker.support', summary: `Support response: ${output.slice(0, 80)}` })
      if (isUrgent) {
        result.audit.push({ type: 'escalation', summary: 'Urgent support issue flagged', metadata: { reason: 'urgent_keywords' } })
      }
      return result
    }
  )
}
