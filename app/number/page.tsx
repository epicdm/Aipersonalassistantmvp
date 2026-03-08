import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import NumberClient from "./number-client";

export default async function NumberPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) redirect("/login");

  return <NumberClient agent={agent} />;
}
