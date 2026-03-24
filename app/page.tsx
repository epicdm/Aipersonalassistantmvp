import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LandingWrapper } from "@/app/components/landing-wrapper";

export const metadata = {
  title: "BFF — AI WhatsApp Assistant for Business",
  description:
    "Turn your WhatsApp into a 24/7 AI-powered customer service agent. Set up in under 5 minutes. No technical skills needed.",
  openGraph: {
    title: "BFF — AI WhatsApp Assistant for Business",
    description:
      "Turn your WhatsApp into a 24/7 AI-powered customer service agent.",
    url: "https://bff.epic.dm",
    siteName: "BFF",
    type: "website",
  },
};

export default async function Home() {
  // Server-side auth check — signed-in users skip the landing page
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return <LandingWrapper />;
}
