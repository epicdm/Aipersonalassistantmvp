export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import KnowledgeClient from "./knowledge-client";

export default async function KnowledgePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return <KnowledgeClient />;
}
