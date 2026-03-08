import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import TemplateDashboard from "./template-dashboard";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent || !agent.name || agent.name === "My Agent") redirect("/create");

  // Check if agent needs template-specific setup
  const needsSetup = agent.template && !agent.config?.setupComplete;

  return (
    <TemplateDashboard
      agent={JSON.parse(JSON.stringify(agent))}
      needsSetup={!!needsSetup}
    />
  );
}
