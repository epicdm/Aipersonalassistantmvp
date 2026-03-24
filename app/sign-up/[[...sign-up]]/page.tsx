import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <SignUp
        fallbackRedirectUrl="/create"
        signInUrl="/sign-in"
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
