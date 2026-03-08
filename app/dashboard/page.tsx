import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import TemplateDashboard from "./template-dashboard";
import AgentGrid from "./agent-grid";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const agents = await prisma.agent.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // No agents → go to create
  if (agents.length === 0) redirect("/create");

  // Check if the only agent needs setup (no name)
  if (agents.length === 1) {
    const agent = agents[0];
    if (!agent.name || agent.name === "My Agent") redirect("/create");

    const needsSetup = !!(agent.template && !(agent.config as Record<string, unknown>)?.setupComplete);
    return (
      <TemplateDashboard
        agent={JSON.parse(JSON.stringify(agent))}
        needsSetup={needsSetup}
      />
    );
  }

  // Multiple agents → show grid
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  return (
    <AgentGrid
      agents={JSON.parse(JSON.stringify(agents))}
      user={{ plan: dbUser?.plan || "free" }}
    />
  );
}
