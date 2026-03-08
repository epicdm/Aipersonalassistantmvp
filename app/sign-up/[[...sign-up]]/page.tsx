import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <SignUp
        afterSignUpUrl="/create"
        signInUrl="/sign-in"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-gray-900 border border-gray-800",
          },
        }}
      />
    </div>
  );
}
