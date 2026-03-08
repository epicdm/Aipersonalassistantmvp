const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AgentRecord = {
  id: string;
  name: string;
  template: string | null;
  purpose: string | null;
  tone: string | null;
  config: unknown;
};

function getSystemPrompt(agent: AgentRecord): string {
  const config = agent.config as Record<string, unknown> | null;
  const template = agent.template || "assistant";

  // Use soul/purpose from agent config if available
  const purpose = (config as Record<string, unknown>)?.purpose as string ||
    agent.purpose ||
    "Be a helpful personal assistant";

  const tone = (config as Record<string, unknown>)?.tone as string ||
    agent.tone ||
    "friendly";

  return `You are ${agent.name}, a ${tone} AI assistant. ${purpose}

You communicate via WhatsApp. Keep responses concise (1-3 sentences when possible). Be warm and helpful. Do not use markdown formatting — plain text only, as this is WhatsApp.

Template: ${template}`;
}

export async function getAgentResponse(
  agent: AgentRecord,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const systemPrompt = getSystemPrompt(agent);

  // Keep last 10 messages for context
  const recentHistory = history.slice(-10);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
}

export function getWelcomeMessage(agent: AgentRecord): string {
  const template = agent.template || "assistant";

  switch (template) {
    case "personal-assistant":
      return `Hey! I'm ${agent.name} ✨ Your personal assistant is live and ready to help! I can track your bills, set reminders, manage your to-dos, or just chat. What would you like to start with?`;
    case "customer-support":
      return `Hi there! I'm ${agent.name} 👋 I'm here to help with any questions or issues you might have. How can I assist you today?`;
    case "sales":
      return `Hello! I'm ${agent.name} 🎯 Ready to help you find exactly what you're looking for. What can I do for you today?`;
    case "appointment":
      return `Hey! I'm ${agent.name} 📅 I can help you schedule appointments, send reminders, and manage your calendar. What would you like to book?`;
    default:
      return `Hey! I'm ${agent.name} ✨ I'm your AI assistant and I'm all set up. How can I help you today?`;
  }
}
