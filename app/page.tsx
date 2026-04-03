import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LandingWrapper } from "@/app/components/landing-wrapper";

export const metadata = {
  title: "Isola — Run your business from anywhere",
  description: "Your business on WhatsApp, on autopilot. AI agents that answer calls, reply to messages, and handle customers 24/7. Built in Dominica for the Caribbean.",
  metadataBase: new URL("https://isola.epic.dm"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Isola — Run your business from anywhere",
    description: "Your business on WhatsApp, on autopilot. AI agents that answer calls, reply to messages, and handle customers 24/7.",
    url: "https://isola.epic.dm",
    siteName: "Isola by EPIC",
    type: "website",
  },
};

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return <LandingWrapper />;
}
