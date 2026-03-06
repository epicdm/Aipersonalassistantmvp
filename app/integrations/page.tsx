import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import IntegrationsClient from "./integrations-client";

export default async function IntegrationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <IntegrationsClient />;
}
