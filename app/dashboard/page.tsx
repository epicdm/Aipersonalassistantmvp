import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import AgentChatHome from "./agent-chat-home";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent || !agent.name || agent.name === "My Agent") redirect("/create");

  return <AgentChatHome />;
}
