export const ONBOARDING_OPENERS: Record<string, string> = {
  receptionist: "Hi! I'm {name} 👋 I'm your new AI receptionist. What's your business called, and what do you do? I'll start handling your messages right away.",
  sales: "Hey! I'm {name} 🎯 Ready to follow up on every lead so none go cold. What are you selling and where? I'll handle the first response.",
  collections: "Hi! I'm {name} 📞 I'll help recover overdue payments. What's your company name, and how does your billing cycle work?",
  concierge: "Hey! I'm {name} 🌴 Tell me about your property — where is it, what are the house rules, wifi password, and anything guests always ask?",
  support: "Hi! I'm {name} 🎧 I'll handle your customer messages. What's your company name, and what are the most common issues customers contact you about?",
  assistant: "Hey! I'm {name} ✨ Your personal assistant. What's the first thing you want me to help you stay on top of — reminders, bills, your schedule?",
}

export function getOnboardingOpener(template: string, agentName: string): string {
  const opener = ONBOARDING_OPENERS[template] || ONBOARDING_OPENERS.support
  return opener.replace('{name}', agentName)
}

export async function extractKnowledge(conversation: string[], agentName: string): Promise<object> {
  // Use DeepSeek to extract structured knowledge from onboarding conversation
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
  const prompt = `Extract business information from this onboarding conversation and return valid JSON only.

Agent: ${agentName}
Conversation:
${conversation.join('\n')}

Return JSON with these fields (use null for unknown):
{
  "businessName": string,
  "services": string,
  "hours": string,
  "targetCustomers": string,
  "commonQuestions": string,
  "escalationTriggers": string,
  "restrictions": string
}`

  try {
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    const d = await r.json()
    return JSON.parse(d.choices?.[0]?.message?.content || '{}')
  } catch {
    return {}
  }
}
