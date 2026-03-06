import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb } from "@/app/lib/localdb";
import ChatClient from "./chat-client";

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await loadDb();
  const agent = db.data!.agents.find((a: any) => a.userId === user.id);
  return <ChatClient agent={agent || null} />;
}
