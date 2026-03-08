import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import CreationFlow from "./creation-flow";

export default async function CreatePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return <CreationFlow />;
}
