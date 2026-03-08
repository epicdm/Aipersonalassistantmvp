import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import WhatsAppClient from "./whatsapp-client";

export default async function WhatsAppPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  if (!agent) redirect("/sign-in");

  return <WhatsAppClient agent={agent} />;
}
