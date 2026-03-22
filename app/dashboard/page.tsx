export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/app/lib/prisma";
import TemplateDashboard from "./template-dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const agents = await prisma.agent.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // No agents → onboarding (agent handles it via WhatsApp conversation)
  if (agents.length === 0) redirect("/create");

  // Single agent → jump straight into their dashboard
  if (agents.length === 1) {
    return (
      <TemplateDashboard
        agent={JSON.parse(JSON.stringify(agents[0]))}
        needsSetup={false}
      />
    );
  }

  // Multiple agents → grid
  const { default: AgentGrid } = await import("./agent-grid");
  return <AgentGrid agents={JSON.parse(JSON.stringify(agents))} plan="free" />;
}
