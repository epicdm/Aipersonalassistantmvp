import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import ChatClient from "./chat-client";

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const agent = await prisma.agent.findFirst({ where: { userId: user.id } });
  return <ChatClient agent={agent} />;
}
