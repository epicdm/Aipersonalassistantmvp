import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb } from "@/app/lib/localdb";
import WhatsAppClient from "./whatsapp-client";

export default async function WhatsAppPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await loadDb();
  const agent = db.data!.agents.find((a) => a.userId === user.id);
  if (!agent) redirect("/login");

  return <WhatsAppClient agent={agent} />;
}
