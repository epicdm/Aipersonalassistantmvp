"use client";

import { useRouter } from "next/navigation";
import { Landing } from "@/app/components/landing";

export function LandingWrapper() {
  const router = useRouter();
  return <Landing onStart={() => router.push("/sign-up")} />;
}
