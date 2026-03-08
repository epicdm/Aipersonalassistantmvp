import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import SupervisionClient from "./supervision-client";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  // MVP: any logged-in user can access supervision
  return <SupervisionClient />;
}
