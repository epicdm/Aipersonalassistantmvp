import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import { db, loadDb } from "@/app/lib/localdb";
import NumberClient from "./number-client";

export default async function NumberPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await loadDb();
  const agent = db.data!.agents.find((a) => a.userId === user.id);
  if (!agent) redirect("/login");

  return <NumberClient agent={agent} />;
}
