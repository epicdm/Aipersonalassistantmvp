// app/lib/runtime/workers/sales.ts
import { runAgenticLoop } from '../worker-base'
import { emptyResult, type RuntimeContext, type WorkerDecision } from '../types'

const SYSTEM_PROMPT = `You are a sales assistant AI focused on converting inquiries into qualified leads and sales.
Your goal is to understand customer needs, present relevant offerings, and move toward a sale.

Guidelines:
- Identify customer needs through questions
- Present relevant products/services
- Qualify leads (budget, timeline, authority)
- Offer to create bookings or send payment links
- Be persuasive but not pushy

Available tools:
- [TOOL:catalog.lookup]{"query": "product name"}[/TOOL] - Look up products
- [TOOL:contact.qualify]{"interest": "high/medium/low"}[/TOOL] - Qualify the lead
- [TOOL:payment.link]{"amount": 100, "description": "Service fee"}[/TOOL] - Generate payment link
- [TOOL:booking.create]{"date": "YYYY-MM-DD"}[/TOOL] - Schedule demo/consultation

Focus on value and benefits. Close when appropriate.`

export async function planSalesResponse(context: RuntimeContext & { messageText?: string }): Promise<WorkerDecision> {
  return runAgenticLoop(
    { name: 'sales', systemPrompt: SYSTEM_PROMPT, tools: ['catalog.lookup', 'contact.qualify', 'payment.link', 'booking.create'] },
    context,
    (output) => {
      const result = emptyResult('sales')
      result.outbound.push({ kind: 'reply', text: output.trim() })
      result.actions.push({ type: 'reply', requiresApproval: false, risk: 'low', payload: { reply: output.trim() } })
      result.audit.push({ type: 'worker.sales', summary: `Sales response: ${output.slice(0, 80)}` })
      return result
    }
  )
}
