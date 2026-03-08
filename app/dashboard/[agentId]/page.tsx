import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import TemplateDashboard from "../template-dashboard";

export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
  });

  if (!agent) notFound();

  const needsSetup = !!(agent.template && !(agent.config as Record<string, unknown>)?.setupComplete);

  return (
    <TemplateDashboard
      agent={JSON.parse(JSON.stringify(agent))}
      needsSetup={needsSetup}
    />
  );
}
