"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Landing } from "@/app/components/landing";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // If already signed in, skip landing page
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) return null;

  return <Landing onStart={() => router.push("/sign-up")} />;
}
