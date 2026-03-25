export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  // New users with no agents → force onboarding
  const agentCount = await prisma.agent.count({ where: { userId: user.id } });
  if (agentCount === 0) {
    redirect("/create");
  }

  return <>{children}</>;
}
