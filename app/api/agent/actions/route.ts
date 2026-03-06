import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb } from "@/app/lib/localdb";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * GET /api/agent/actions
 * Returns the agent's action log — every tool call, approval, and execution.
 * OpenClaw logs these via hooks.internal.command-logger.
 * 
 * This is the "we can show every action" promise from the security story.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent?.deployment?.workspace) {
    return NextResponse.json({ actions: [], message: "Agent not deployed" });
  }

  const workspace = agent.deployment.workspace;
  const actions: any[] = [];

  // Read from OpenClaw's session logs
  const logsDir = join(workspace, ".openclaw", "sessions");
  if (existsSync(logsDir)) {
    try {
      const { readdirSync } = await import("fs");
      const sessions = readdirSync(logsDir).filter((f: string) => f.endsWith(".json"));
      
      for (const sessionFile of sessions.slice(-10)) {
        try {
          const raw = await readFile(join(logsDir, sessionFile), "utf-8");
          const session = JSON.parse(raw);
          
          // Extract tool calls from messages
          if (session.messages) {
            for (const msg of session.messages) {
              if (msg.role === "assistant" && msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                  actions.push({
                    id: tc.id,
                    timestamp: msg.timestamp || session.createdAt,
                    tool: tc.function?.name || "unknown",
                    action: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
                    status: "executed",
                  });
                }
              }
            }
          }
        } catch {
          // Skip corrupted session files
        }
      }
    } catch {
      // Session logs not available yet
    }
  }

  // Also read from the memory files for a human-readable action summary
  const memoryDir = join(workspace, "memory");
  const today = new Date().toISOString().split("T")[0];
  const memoryFile = join(memoryDir, `${today}.md`);
  let todayMemory = "";
  if (existsSync(memoryFile)) {
    todayMemory = await readFile(memoryFile, "utf-8");
  }

  return NextResponse.json({
    actions: actions.slice(-50), // Last 50 actions
    todayMemory,
    agentName: agent.config?.name || "Agent",
    deployedAt: agent.deployment?.deployedAt,
  });
}
