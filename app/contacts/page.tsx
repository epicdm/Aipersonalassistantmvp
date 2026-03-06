import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/session";
import ContactsClient from "./contacts-client";

export default async function ContactsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <ContactsClient />;
}
