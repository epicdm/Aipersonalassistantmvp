import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb } from "@/app/lib/localdb";
import AgentChatHome from "./agent-chat-home";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // If no agent configured, send to creation flow
  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  if (!agent || !agent.config?.name || agent.config?.name === "My Agent") redirect("/create");

  return <AgentChatHome />;
}
