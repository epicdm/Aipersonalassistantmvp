"use client";

import { Landing } from "./landing";
import { useRouter } from "next/navigation";

export function LandingWrapper() {
  const router = useRouter();
  return <Landing onStart={() => router.push("/sign-up")} />;
}
