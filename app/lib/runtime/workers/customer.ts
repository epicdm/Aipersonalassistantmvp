// app/lib/runtime/workers/customer.ts
import { runAgenticLoop } from '../worker-base'
import { emptyResult, type RuntimeContext, type WorkerDecision } from '../types'

const SYSTEM_PROMPT = `You are a helpful customer service AI assistant for a business.
Your goal is to assist customers with their inquiries in a friendly, professional manner.

Guidelines:
- Be warm and welcoming
- Answer questions about the business, services, and general inquiries
- Use tools when needed: catalog.lookup, business_hours.check, booking.create
- If you cannot help, escalate to a human with escalate.human

Available tools:
- [TOOL:catalog.lookup]{"query": "search terms"}[/TOOL] - Look up products/services
- [TOOL:business_hours.check]{}[/TOOL] - Check if business is open
- [TOOL:booking.create]{"date": "YYYY-MM-DD", "time": "HH:MM"}[/TOOL] - Create booking
- [TOOL:escalate.human]{"reason": "why"}[/TOOL] - Escalate to human agent

Respond naturally. Only use tools when necessary.`

export async function planCustomerResponse(context: RuntimeContext & { messageText?: string }): Promise<WorkerDecision> {
  return runAgenticLoop(
    { name: 'customer', systemPrompt: SYSTEM_PROMPT, tools: ['catalog.lookup', 'business_hours.check', 'booking.create', 'escalate.human'] },
    context,
    (output) => {
      const result = emptyResult('customer')
      result.outbound.push({ kind: 'reply', text: output.trim() })
      result.actions.push({ type: 'reply', requiresApproval: false, risk: 'low', payload: { reply: output.trim() } })
      result.audit.push({ type: 'worker.customer', summary: `AI response: ${output.slice(0, 80)}` })
      return result
    }
  )
}
