/**
 * Free Tier Agent Routing
 *
 * Free users don't get a dedicated OpenClaw process.
 * Instead, their messages are routed through the main gateway
 * as isolated sessions with their SOUL.md injected.
 *
 * This is dramatically cheaper: no extra RAM, no extra port,
 * no systemd service. Just a session with personality.
 *
 * Architecture:
 *   User message → AIVA API → Main OpenClaw gateway → 
 *   sessions_spawn(task, soul=SOUL.md) → response → user
 *
 * Limits (free tier):
 *   - 50 messages/day
 *   - No background workflows
 *   - No persistent memory across sessions
 *   - Cheapest model only (DeepSeek or GPT-5 Nano)
 *   - 3 tools max
 */

import { generateSoulMd, type AgentConfig } from "../soul-generator";

const MAIN_GATEWAY_URL = "http://127.0.0.1:18789";
const MAIN_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "341e65605497a047f70ff20e7c41c7d0ef515d10415e3795";
const FREE_MODEL = "deepseek/deepseek-chat";
const FREE_MESSAGE_LIMIT = 50;

interface FreeTierMessage {
  userId: string;
  message: string;
  agentConfig: AgentConfig;
  ownerName?: string;
}

interface FreeTierResponse {
  reply: string;
  messagesUsed: number;
  messagesRemaining: number;
  error?: string;
}

// In-memory daily counter (resets at midnight UTC)
const dailyCounts: Map<string, { count: number; date: string }> = new Map();

function getDailyCount(userId: string): number {
  const today = new Date().toISOString().split("T")[0];
  const entry = dailyCounts.get(userId);
  if (!entry || entry.date !== today) {
    dailyCounts.set(userId, { count: 0, date: today });
    return 0;
  }
  return entry.count;
}

function incrementDailyCount(userId: string): number {
  const today = new Date().toISOString().split("T")[0];
  const entry = dailyCounts.get(userId);
  if (!entry || entry.date !== today) {
    dailyCounts.set(userId, { count: 1, date: today });
    return 1;
  }
  entry.count++;
  return entry.count;
}

/**
 * Send a message to the free-tier agent via the main gateway.
 * Uses OpenClaw's HTTP chat completions endpoint.
 */
export async function sendFreeTierMessage(msg: FreeTierMessage): Promise<FreeTierResponse> {
  const count = getDailyCount(msg.userId);
  
  if (count >= FREE_MESSAGE_LIMIT) {
    return {
      reply: `You've reached the daily message limit (${FREE_MESSAGE_LIMIT} messages). Upgrade to Pro for unlimited messages, background workflows, and a dedicated agent.`,
      messagesUsed: count,
      messagesRemaining: 0,
      error: "daily_limit_reached",
    };
  }

  // Generate SOUL.md for this user's agent
  const soul = generateSoulMd(
    { ...msg.agentConfig, tier: "free" },
    msg.ownerName
  );

  // Build the system prompt from SOUL.md
  const systemPrompt = `${soul}\n\n---\n\n## Session Rules\n- You are on the free tier. Be helpful but concise.\n- You have ${FREE_MESSAGE_LIMIT - count - 1} messages remaining today.\n- If the user needs more capability, mention they can upgrade to Pro.`;

  try {
    // Use OpenClaw's chat completions endpoint
    const res = await fetch(`${MAIN_GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MAIN_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: msg.message },
        ],
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gateway error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";

    const used = incrementDailyCount(msg.userId);

    return {
      reply,
      messagesUsed: used,
      messagesRemaining: FREE_MESSAGE_LIMIT - used,
    };
  } catch (err: any) {
    return {
      reply: "I'm having trouble connecting right now. Please try again in a moment.",
      messagesUsed: count,
      messagesRemaining: FREE_MESSAGE_LIMIT - count,
      error: err.message,
    };
  }
}
