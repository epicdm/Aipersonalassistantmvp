export const dynamic = "force-dynamic";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
  });

  if (!agent) notFound();

  // Redirect to main conversations view with agent context
  redirect(`/dashboard/conversations?agentId=${agentId}`);
}
