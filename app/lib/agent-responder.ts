/**
 * Shared AI agent response generator.
 * Extracted from webhook/route.ts for multi-channel support.
 * Only the LLM call + escalation check. Each channel handler
 * owns its own contact/conversation/message management.
 */

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AgentResponse {
  text: string
  escalated: boolean
}

/**
 * Generate an AI response using the agent's context and conversation history.
 * Returns the response text and whether escalation was triggered.
 */
export async function generateAgentResponse(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  fallback = "Thanks for reaching out. How can I help?"
): Promise<AgentResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ]

  let text: string
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      console.error('[AgentResponder] LLM error:', res.status)
      text = fallback
    } else {
      const data = await res.json()
      text = data.choices?.[0]?.message?.content?.trim() || fallback
    }
  } catch (err: any) {
    console.error('[AgentResponder] LLM call failed:', err.message)
    text = fallback
  }

  // Check for escalation token
  const escalated = /ESCALATE/i.test(text)
  if (escalated) {
    text = text.replace(/ESCALATE/gi, '').trim()
  }

  return { text, escalated }
}
