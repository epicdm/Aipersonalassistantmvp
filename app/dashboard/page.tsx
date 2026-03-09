export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import TemplateDashboard from "./template-dashboard";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  // No agents? Go to creation
  if (agents.length === 0) redirect("/create");

  // Single agent → template dashboard (setup wizard removed — agent handles onboarding via WhatsApp)
  if (agents.length === 1) {
    const agent = agents[0];
    return (
      <TemplateDashboard
        agent={JSON.parse(JSON.stringify(agent))}
        needsSetup={false}
      />
    );
  }

  // Multiple agents → grid view
  // Import dynamically to keep single-agent path fast
  const { default: AgentGrid } = await import("./agent-grid");
  return <AgentGrid agents={JSON.parse(JSON.stringify(agents))} plan={user.plan || "free"} />;
}
