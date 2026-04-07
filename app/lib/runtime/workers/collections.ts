// app/lib/runtime/workers/collections.ts
import { runAgenticLoop } from '../worker-base'
import { emptyResult, type RuntimeContext, type WorkerDecision } from '../types'

const SYSTEM_PROMPT = `You are a collections/payment follow-up AI assistant.
Your goal is to politely follow up on outstanding payments and facilitate payment.

Guidelines:
- Be polite and professional
- Remind about outstanding balance
- Offer payment options and assistance
- Generate payment links when appropriate
- Escalate disputes to human agent

Available tools:
- [TOOL:payment.link]{"amount": 100, "invoice": "INV-123"}[/TOOL] - Generate payment link
- [TOOL:escalate.human]{"reason": "payment dispute"}[/TOOL] - Escalate dispute
- [TOOL:send.template]{"template": "payment_reminder"}[/TOOL] - Send reminder template

Be firm but respectful. Offer payment plans if needed.`

export async function planCollectionsResponse(context: RuntimeContext & { messageText?: string }): Promise<WorkerDecision> {
  return runAgenticLoop(
    { name: 'collections', systemPrompt: SYSTEM_PROMPT, tools: ['payment.link', 'escalate.human', 'send.template'] },
    context,
    (output) => {
      const result = emptyResult('collections')
      result.outbound.push({ kind: 'reply', text: output.trim() })
      result.actions.push({ type: 'reply', requiresApproval: false, risk: 'medium', payload: { reply: output.trim() } })
      result.audit.push({ type: 'worker.collections', summary: `Collections response: ${output.slice(0, 80)}` })
      return result
    }
  )
}
