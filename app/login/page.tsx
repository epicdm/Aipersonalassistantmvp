"use client";

import { useRouter } from "next/navigation";
import { Auth } from "@/app/components/auth";

export default function LoginPage() {
  const router = useRouter();
  return (
    <Auth
      onBack={() => router.push("/")}
      onSuccess={() => router.push("/dashboard")}
      initialView="login"
    />
  );
}
