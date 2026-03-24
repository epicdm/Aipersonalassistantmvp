import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#111111] border border-white/[0.07]",
          },
        }}
      />
    </div>
  );
}
