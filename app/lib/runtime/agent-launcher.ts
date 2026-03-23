/**
 * Agent Runtime Launcher
 *
 * Takes a user's agent config + generated SOUL.md and provisions
 * a live OpenClaw agent instance. For MVP, we use multi-tenant
 * approach: each agent gets its own workspace dir + systemd service
 * sharing the same OpenClaw binary but with isolated config.
 *
 * Architecture:
 *   /var/lib/aiva/agents/<agentId>/
 *     ├── openclaw.json     ← generated config
 *     ├── SOUL.md           ← agent personality
 *     ├── AGENTS.md         ← agent instructions
 *     ├── USER.md           ← owner context
 *     ├── memory/           ← agent memory
 *     └── data/             ← agent data
 */

import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { generateSoulMd, type AgentConfig } from "../soul-generator";

const AGENTS_BASE = "/var/lib/aiva/agents";
const OPENCLAW_BIN = "/usr/bin/openclaw";
const GATEWAY_PORT_START = 19000; // Each agent gets a unique port

interface LaunchResult {
  agentId: string;
  status: "launched" | "updated" | "error";
  port: number;
  workspace: string;
  error?: string;
}

interface AgentUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Choose the default model for AIVA agents.
 * Uses cost-efficient models — users aren't paying for Opus.
 */
function getAgentModel(tier: "free" | "starter" | "pro" = "starter") {
  switch (tier) {
    case "free":
      return {
        primary: "deepseek/deepseek-chat",
        fallbacks: ["ollama/qwen2.5:7b-instruct-q4_K_M"],
      };
    case "starter":
      return {
        primary: "kimi/kimi-k2.5",
        fallbacks: [
          "deepseek/deepseek-chat",
          "openai/gpt-5-nano",
          "google/gemini-2.5-flash-lite",
        ],
      };
    case "pro":
      return {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: [
          "kimi/kimi-k2.5",
          "deepseek/deepseek-chat",
          "openai/gpt-5-mini",
        ],
      };
  }
}

/**
 * Generate a minimal OpenClaw config for an AIVA agent.
 * Shares API keys with the main instance but has its own
 * workspace, channels, and personality.
 */
async function loadMainKeys(): Promise<Record<string, string>> {
  try {
    const raw = await readFile("/home/epicadmin/.openclaw/openclaw.json", "utf-8");
    const cfg = JSON.parse(raw);
    return {
      deepseek: cfg.models?.providers?.deepseek?.apiKey || "",
      kimi: cfg.models?.providers?.kimi?.apiKey || "",
      openai: cfg.env?.OPENAI_API_KEY || "",
      gemini: cfg.env?.GEMINI_API_KEY || "",
      brave: cfg.tools?.web?.search?.apiKey || "",
      anthropic: "", // from auth profile
    };
  } catch {
    return { deepseek: "", kimi: "", openai: "", gemini: "", brave: "", anthropic: "" };
  }
}

async function generateOpenClawConfig(opts: {
  agentId: string;
  workspace: string;
  port: number;
  whatsappEnabled: boolean;
  phoneNumber?: string;
  tier?: "free" | "starter" | "pro";
}) {
  const model = getAgentModel(opts.tier || "starter");
  const keys = await loadMainKeys();

  return {
    env: {
      OPENAI_API_KEY: keys.openai,
      GEMINI_API_KEY: keys.gemini,
    },
    models: {
      mode: "merge",
      providers: {
        deepseek: {
          baseUrl: "https://api.deepseek.com/v1",
          apiKey: keys.deepseek,
          api: "openai-completions",
          models: [
            {
              id: "deepseek-chat",
              name: "DeepSeek Chat",
              api: "openai-completions",
              reasoning: false,
              input: ["text"],
              cost: { input: 0.28, output: 0.42, cacheRead: 0.028, cacheWrite: 0.28 },
              contextWindow: 128000,
              maxTokens: 8192,
            },
          ],
        },
        kimi: {
          baseUrl: "https://api.moonshot.ai/v1",
          apiKey: keys.kimi,
          api: "openai-completions",
          models: [
            {
              id: "kimi-k2.5",
              name: "Kimi K2.5",
              api: "openai-completions",
              reasoning: false,
              input: ["text"],
              cost: { input: 0.6, output: 3, cacheRead: 0.15, cacheWrite: 0.6 },
              contextWindow: 262144,
              maxTokens: 16384,
            },
          ],
        },
        openai: {
          baseUrl: "https://api.openai.com/v1",
          apiKey: keys.openai,
          api: "openai-completions",
          models: [
            {
              id: "gpt-5-nano",
              name: "GPT-5 Nano",
              api: "openai-completions",
              reasoning: false,
              input: ["text"],
              cost: { input: 0.05, output: 0.4, cacheRead: 0.013, cacheWrite: 0.05 },
              contextWindow: 1048576,
              maxTokens: 16384,
            },
          ],
        },
        google: {
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          apiKey: keys.gemini,
          api: "google-generative-ai",
          models: [
            {
              id: "gemini-2.5-flash-lite",
              name: "Gemini Flash-Lite",
              api: "google-generative-ai",
              reasoning: false,
              input: ["text"],
              cost: { input: 0.08, output: 0.3, cacheRead: 0.02, cacheWrite: 0.08 },
              contextWindow: 1048576,
              maxTokens: 65536,
            },
          ],
        },
        anthropic: {
          baseUrl: "https://api.anthropic.com",
          api: "anthropic-messages",
          models: [
            {
              id: "claude-sonnet-4-6",
              name: "Claude Sonnet 4.5",
              api: "anthropic-messages",
              reasoning: false,
              input: ["text", "image"],
              cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
              contextWindow: 200000,
              maxTokens: 64000,
            },
          ],
        },
      },
    },
    agents: {
      defaults: {
        model: model,
        workspace: opts.workspace,
        contextPruning: {
          mode: "cache-ttl",
          ttl: "5m",
          keepLastAssistants: 2,
          softTrimRatio: 0.6,
          hardClearRatio: 0.85,
        },
        compaction: {
          mode: "safeguard",
        },
        blockStreamingBreak: "text_end",
        heartbeat: { every: "2h" },
        maxConcurrent: 2,
      },
    },
    tools: {
      web: {
        search: { enabled: true, apiKey: keys.brave },
        fetch: { enabled: true },
      },
    },
    channels: {
      whatsapp: opts.whatsappEnabled
        ? {
            dmPolicy: "open",
            groupPolicy: "allowlist",
          }
        : undefined,
    },
    gateway: {
      port: opts.port,
      mode: "local",
      bind: "loopback",
      auth: {
        mode: "token",
        token: generateToken(),
      },
    },
    commands: {
      native: "auto",
    },
    hooks: {
      enabled: true,
      token: generateToken(),
      internal: {
        enabled: true,
        entries: {
          "boot-md": { enabled: true },
        },
      },
    },
  };
}

function generateToken(): string {
  const chars = "abcdef0123456789";
  return Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Generate AGENTS.md for an AIVA-managed agent.
 * Simpler than ARC's version — focused on the user's use case.
 */
function generateAgentsMd(agentName: string): string {
  return `# AGENTS.md

## Every Session
1. Read SOUL.md — this is who you are
2. Read USER.md — this is who you're helping

## Behavior
- Be helpful, accurate, and proactive
- Use your tools when they would help the user
- If you don't know something, say so
- Keep conversations focused on your mission
- Protect user privacy at all times

## Memory
- Write important context to memory/YYYY-MM-DD.md
- Review recent memory files at the start of each session
`;
}

/**
 * Generate USER.md from the AIVA user's account info.
 */
function generateUserMd(user: AgentUser): string {
  return `# USER.md

- **Name:** ${user.name || "User"}
- **Email:** ${user.email}
- **Account ID:** ${user.id}
`;
}

/**
 * Create the systemd service unit for an agent.
 */
async function setupConfigHome(workspace: string): Promise<void> {
  // OpenClaw reads from $HOME/.openclaw/openclaw.json
  // Since HOME=workspace, create .openclaw inside workspace
  const configDir = join(workspace, ".openclaw");
  await mkdir(configDir, { recursive: true });
  const src = join(workspace, "openclaw.json");
  const dst = join(configDir, "openclaw.json");
  try {
    execSync(`ln -sf ${src} ${dst}`);
  } catch {
    const content = await readFile(src, "utf-8");
    await writeFile(dst, content);
  }
}

function generateSystemdUnit(agentId: string, workspace: string, port: number, token: string): string {
  // Use the same command pattern as the main OpenClaw gateway service
  const nodeExe = "/usr/bin/node";
  const gatewayEntry = "/usr/lib/node_modules/openclaw/dist/index.js";

  return `[Unit]
Description=AIVA Agent: ${agentId}
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=120
StartLimitBurst=5

[Service]
Type=simple
ExecStart=${nodeExe} ${gatewayEntry} gateway --port ${port}
Restart=on-failure
RestartSec=10
KillMode=process
Environment=HOME=${workspace}
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=OPENCLAW_GATEWAY_PORT=${port}
Environment=OPENCLAW_GATEWAY_TOKEN=${token}
Environment=OPENCLAW_SERVICE_MARKER=aiva-agent
Environment=OPENCLAW_SERVICE_KIND=gateway
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aiva-${agentId}

[Install]
WantedBy=multi-user.target
`;
}

/**
 * Launch or update an agent instance.
 */
export async function launchAgent(
  user: AgentUser,
  config: AgentConfig,
  tier: "free" | "starter" | "pro" = "starter"
): Promise<LaunchResult> {
  const agentId = `aiva-${user.id.slice(0, 8)}`;
  const workspace = join(AGENTS_BASE, agentId);
  const isUpdate = existsSync(workspace);

  try {
    // 1. Create workspace directories
    await mkdir(join(workspace, "memory"), { recursive: true });
    await mkdir(join(workspace, "data"), { recursive: true });

    // 2. Allocate a port (simple: hash of agentId)
    const portOffset = parseInt(user.id.replace(/\D/g, "").slice(0, 4)) || 1;
    const port = GATEWAY_PORT_START + (portOffset % 1000);

    // 3. Generate all config files
    const soul = generateSoulMd(config, user.name || user.email);
    const agentsMd = generateAgentsMd(config.name || "Assistant");
    const userMd = generateUserMd(user);
    const openclawConfig = await generateOpenClawConfig({
      agentId,
      workspace,
      port,
      whatsappEnabled: config.whatsappConnected || false,
      phoneNumber: config.phoneNumber,
      tier,
    });

    // 4. Write files
    await writeFile(join(workspace, "SOUL.md"), soul);
    await writeFile(join(workspace, "AGENTS.md"), agentsMd);
    await writeFile(join(workspace, "USER.md"), userMd);
    await writeFile(
      join(workspace, "openclaw.json"),
      JSON.stringify(openclawConfig, null, 2)
    );

    // 5. Setup config dir (OpenClaw reads from $HOME/.openclaw/)
    await setupConfigHome(workspace);

    // 6. Create shared env file (API keys) if it doesn't exist
    const sharedEnvPath = "/var/lib/aiva/shared.env";
    if (!existsSync(sharedEnvPath)) {
      await mkdir("/var/lib/aiva", { recursive: true });
      // Read keys from main OpenClaw config
      const mainConfig = JSON.parse(
        await readFile("/home/epicadmin/.openclaw/openclaw.json", "utf-8")
      );
      const envLines = [
        `DEEPSEEK_API_KEY=${mainConfig.models?.providers?.deepseek?.apiKey || ""}`,
        `KIMI_API_KEY=${mainConfig.models?.providers?.kimi?.apiKey || ""}`,
        `OPENAI_API_KEY=${mainConfig.env?.OPENAI_API_KEY || ""}`,
        `GEMINI_API_KEY=${mainConfig.env?.GEMINI_API_KEY || ""}`,
        `BRAVE_API_KEY=${mainConfig.tools?.web?.search?.apiKey || ""}`,
        `ANTHROPIC_API_KEY=`, // From auth profile, not in config
      ];
      await writeFile(sharedEnvPath, envLines.join("\n") + "\n", { mode: 0o600 });
    }

    // 7. Create systemd service
    const serviceName = `aiva-${agentId}`;
    const gwToken = openclawConfig.gateway.auth.token;
    const unitFile = generateSystemdUnit(agentId, workspace, port, gwToken);
    await writeFile(`/etc/systemd/system/${serviceName}.service`, unitFile);

    // 8. Reload systemd and start/restart the service
    execSync("systemctl daemon-reload");
    execSync(`systemctl restart ${serviceName}`);
    execSync(`systemctl enable ${serviceName}`);

    return {
      agentId,
      status: isUpdate ? "updated" : "launched",
      port,
      workspace,
    };
  } catch (err: any) {
    return {
      agentId,
      status: "error",
      port: 0,
      workspace,
      error: err.message,
    };
  }
}

/**
 * Stop and remove an agent instance.
 */
export async function stopAgent(userId: string): Promise<{ ok: boolean; error?: string }> {
  const agentId = `aiva-${userId.slice(0, 8)}`;
  const serviceName = `aiva-${agentId}`;

  try {
    execSync(`systemctl stop ${serviceName} 2>/dev/null || true`);
    execSync(`systemctl disable ${serviceName} 2>/dev/null || true`);
    execSync(`rm -f /etc/systemd/system/${serviceName}.service`);
    execSync("systemctl daemon-reload");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Check if an agent is running.
 */
export function getAgentStatus(userId: string): {
  running: boolean;
  agentId: string;
  workspace: string;
} {
  const agentId = `aiva-${userId.slice(0, 8)}`;
  const workspace = join(AGENTS_BASE, agentId);
  const serviceName = `aiva-${agentId}`;

  try {
    const result = execSync(`systemctl is-active ${serviceName} 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    return { running: result === "active", agentId, workspace };
  } catch {
    return { running: false, agentId, workspace };
  }
}
