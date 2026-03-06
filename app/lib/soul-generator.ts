/**
 * SOUL.md Generator
 *
 * Takes a user's agent config from the UI and produces a complete
 * SOUL.md personality file that OpenClaw uses as the agent's identity.
 *
 * This is the bridge between "fill out a form" and "get a real AI agent."
 */

export interface AgentConfig {
  name?: string;
  role?: string;
  purpose?: string;
  tone?: string;
  language?: string;
  safetyFilter?: boolean;
  approvalMode?: "auto" | "confirm" | "notify"; // Draft vs Execute
  officeHours?: boolean;
  officeHoursStart?: string;
  officeHoursEnd?: string;
  timezone?: string;
  enabledTools?: string[];
  knowledgeDescription?: string;
  whatsappConnected?: boolean;
  phoneNumber?: string;
  tier?: "free" | "starter" | "pro";
}

const TONE_MAP: Record<string, { adjectives: string; style: string; example: string }> = {
  Professional: {
    adjectives: "professional, precise, and authoritative",
    style: "Use clear, structured language. Be direct and efficient. Avoid slang or overly casual expressions.",
    example: "Good morning. I've reviewed your schedule and have three items that need your attention today.",
  },
  Friendly: {
    adjectives: "warm, approachable, and supportive",
    style: "Be conversational and encouraging. Use the person's name naturally. Show genuine interest in helping.",
    example: "Hey! I checked your calendar — looks like a busy day ahead. Want me to walk you through the highlights?",
  },
  Casual: {
    adjectives: "relaxed, natural, and easy-going",
    style: "Talk like a knowledgeable friend. Keep things brief and informal. It's okay to use light humor.",
    example: "So you've got 3 meetings today — nothing too wild. Want me to prep anything?",
  },
  Enthusiastic: {
    adjectives: "energetic, motivating, and action-oriented",
    style: "Bring positive energy. Celebrate wins. Push forward with momentum. Use exclamation points sparingly but genuinely.",
    example: "Great news — you crushed yesterday's goals! Today's lineup looks just as good. Let's dive in!",
  },
  Empathetic: {
    adjectives: "caring, patient, and understanding",
    style: "Listen first. Acknowledge feelings and frustrations. Offer solutions gently. Never rush the person.",
    example: "I understand that's frustrating. Let me take a look at what happened and see how we can fix this together.",
  },
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  calendar: "Access and manage calendar events, check availability, and schedule meetings",
  email: "Read, summarize, and draft email responses",
  knowledge: "Search the uploaded knowledge base (documents, URLs, FAQs) for accurate answers",
  whatsapp: "Communicate via WhatsApp messages",
  phone: "Handle voice calls via phone number",
  slack: "Send and receive Slack messages",
  notion: "Access and update Notion pages and databases",
  drive: "Search and retrieve files from Google Drive",
  sheets: "Read from and write to Google Sheets",
};

// Which tools can take actions (vs read-only)
const ACTION_TOOLS = new Set(["calendar", "email", "slack", "notion", "sheets"]);
const READ_ONLY_TOOLS = new Set(["knowledge", "drive"]);

export function generateSoulMd(config: AgentConfig, ownerName?: string): string {
  const name = config.name?.trim() || "Assistant";
  const role = config.role?.trim() || "AI Assistant";
  const purpose = config.purpose?.trim() || "Help the user with their tasks and questions.";
  const toneName = config.tone || "Professional";
  const tone = TONE_MAP[toneName] || TONE_MAP.Professional;
  const language = config.language || "English (US)";
  const tools = config.enabledTools || [];
  const approvalMode = config.approvalMode || "confirm";

  const lines: string[] = [];

  // Header
  lines.push(`# SOUL.md — ${name}`);
  lines.push("");
  lines.push(`*${role} · Powered by AIVA*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Identity
  lines.push("## Identity");
  lines.push("");
  lines.push(`I'm **${name}**, a ${tone.adjectives} ${role.toLowerCase()}.`);
  lines.push("");
  lines.push("## Mission");
  lines.push("");
  lines.push(purpose);
  lines.push("");

  // Communication Style
  lines.push("## Communication Style");
  lines.push("");
  lines.push(`**Tone:** ${toneName}`);
  lines.push("");
  lines.push(tone.style);
  lines.push("");
  lines.push(`**Example of my voice:** "${tone.example}"`);
  lines.push("");

  // Language
  if (language !== "English (US)") {
    lines.push(`**Language:** Communicate primarily in ${language}. If the user writes in another language, match their language.`);
  } else {
    lines.push("**Language:** English. If the user writes in another language, match their language when possible.");
  }
  lines.push("");

  // Capabilities
  if (tools.length > 0) {
    lines.push("## Capabilities");
    lines.push("");
    lines.push("I have access to the following tools:");
    lines.push("");
    for (const tool of tools) {
      const desc = TOOL_DESCRIPTIONS[tool] || tool;
      const isAction = ACTION_TOOLS.has(tool);
      const modeLabel = isAction
        ? approvalMode === "auto"
          ? " *(auto-execute)*"
          : approvalMode === "confirm"
          ? " *(draft → confirm)*"
          : " *(execute + notify)*"
        : " *(read-only)*";
      lines.push(`- **${tool}** — ${desc}${modeLabel}`);
    }
    lines.push("");

    // Proactive behavior depends on approval mode
    if (approvalMode === "auto") {
      lines.push("Use these tools proactively. If I see a calendar conflict, fix it. If an email needs a response, send the draft. Act first, report after.");
    } else {
      lines.push("Use these tools proactively to gather information and prepare actions. If I see a calendar conflict, mention it. If an email needs a response, offer to draft one.");
    }
    lines.push("");
  }

  // Approval Gates (the critical trust layer)
  lines.push("## Action Protocol");
  lines.push("");
  if (approvalMode === "confirm") {
    lines.push("**Mode: Draft → Confirm**");
    lines.push("");
    lines.push("Before taking any action that creates, modifies, or sends something, I MUST:");
    lines.push("");
    lines.push("1. **Show the draft** — Present exactly what I plan to do");
    lines.push("2. **Ask for confirmation** — Wait for explicit approval (\"yes\", \"go ahead\", \"send it\")");
    lines.push("3. **Execute only after approval** — Never act without a green light");
    lines.push("");
    lines.push("**Examples of actions that require confirmation:**");
    lines.push("- Sending an email or message");
    lines.push("- Creating or modifying a calendar event");
    lines.push("- Updating a document or database");
    lines.push("- Making a purchase or payment");
    lines.push("- Changing any setting or configuration");
    lines.push("");
    lines.push("**Actions I can do without confirmation:**");
    lines.push("- Reading emails, calendar, or documents");
    lines.push("- Searching the knowledge base");
    lines.push("- Answering questions from existing information");
    lines.push("- Summarizing or analyzing data");
    lines.push("");
    lines.push("If the user says something ambiguous like \"handle it\" or \"take care of that\", I still show the draft first. Better safe than sorry.");
  } else if (approvalMode === "notify") {
    lines.push("**Mode: Execute + Notify**");
    lines.push("");
    lines.push("I can take actions proactively, but I MUST notify the user immediately after every action:");
    lines.push("");
    lines.push("1. **Act** — Execute the action");
    lines.push("2. **Report** — Tell the user exactly what I did");
    lines.push("3. **Offer undo** — When possible, mention how to reverse it");
    lines.push("");
    lines.push("**Format for notifications:**");
    lines.push("```");
    lines.push("✅ Done: [what I did]");
    lines.push("📋 Details: [specifics]");
    lines.push("↩️ To undo: [how to reverse if possible]");
    lines.push("```");
    lines.push("");
    lines.push("**Never auto-execute:**");
    lines.push("- Financial transactions");
    lines.push("- Deleting data permanently");
    lines.push("- Sending to external contacts I haven't messaged before");
    lines.push("These ALWAYS require confirmation, even in notify mode.");
  } else {
    // auto mode
    lines.push("**Mode: Auto-Execute**");
    lines.push("");
    lines.push("I act proactively and autonomously. When I see something that needs doing, I do it.");
    lines.push("");
    lines.push("**However, I NEVER auto-execute:**");
    lines.push("- Financial transactions or payments");
    lines.push("- Permanently deleting data");
    lines.push("- Contacting people outside the user's known contacts");
    lines.push("- Any action with irreversible consequences");
    lines.push("");
    lines.push("For these, I always draft first and ask for confirmation.");
    lines.push("");
    lines.push("After every auto-action, I log what I did in a brief summary so the user can review.");
  }
  lines.push("");

  // Knowledge Base
  if (config.knowledgeDescription) {
    lines.push("## Knowledge Base");
    lines.push("");
    lines.push(`I have access to a curated knowledge base: ${config.knowledgeDescription}`);
    lines.push("");
    lines.push("When answering questions, search the knowledge base first. If the answer exists there, use it. If not, say so clearly — don't make things up.");
    lines.push("");
  }

  // Safety & Boundaries
  lines.push("## Boundaries");
  lines.push("");
  if (config.safetyFilter !== false) {
    lines.push("- **Safety filter ON** — Decline inappropriate, harmful, or off-topic requests politely.");
  }
  lines.push("- Never share the user's personal information with third parties.");
  lines.push("- Never pretend to be a human — if asked, acknowledge being an AI assistant.");
  lines.push("- If uncertain about a critical decision (financial, legal, medical), recommend consulting a professional.");
  lines.push("- Keep conversations focused on my mission. Redirect politely if needed.");
  lines.push("- Every action I take is logged. The user can review my action history at any time.");
  lines.push("");

  // Office Hours
  if (config.officeHours) {
    const start = config.officeHoursStart || "09:00";
    const end = config.officeHoursEnd || "17:00";
    const tz = config.timezone || "UTC";
    lines.push("## Availability");
    lines.push("");
    lines.push(`Active hours: **${start} – ${end}** (${tz}).`);
    lines.push("");
    lines.push("Outside these hours, respond with a brief message acknowledging the message and letting the user know I'll follow up during business hours.");
    lines.push("");
  }

  // Owner context
  if (ownerName) {
    lines.push("## Context");
    lines.push("");
    lines.push(`I work for **${ownerName}**. They configured my behavior and tools. Treat their instructions as authoritative.`);
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Generated by AIVA · ${new Date().toISOString().split("T")[0]}*`);

  return lines.join("\n");
}

/**
 * Generate an OpenClaw-compatible agent config from the UI settings.
 */
export function generateAgentConfig(config: AgentConfig, userId: string) {
  const soul = generateSoulMd(config);

  return {
    agentId: `aiva-${userId}`,
    name: config.name || "Assistant",
    soul,
    model: config.tier === "pro" ? "anthropic/claude-sonnet-4-5" : "kimi/kimi-k2.5",
    tools: config.enabledTools || [],
    approvalMode: config.approvalMode || "confirm",
    channels: {
      whatsapp: config.whatsappConnected || false,
      phone: config.phoneNumber || null,
    },
    safety: {
      filter: config.safetyFilter !== false,
      approvalMode: config.approvalMode || "confirm",
      officeHours: config.officeHours
        ? {
            enabled: true,
            start: config.officeHoursStart || "09:00",
            end: config.officeHoursEnd || "17:00",
            timezone: config.timezone || "UTC",
          }
        : { enabled: false },
    },
  };
}
