import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Isola — Run your business from anywhere",
  description: "Turn your WhatsApp into a 24/7 AI-powered customer service agent. Set up in under 5 minutes.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://isola.epic.dm"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Isola — Run your business from anywhere",
    description: "Turn your WhatsApp into a 24/7 AI-powered customer service agent.",
    url: "https://isola.epic.dm",
    siteName: "Isola",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/create"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#00333c",
          colorBackground: "#ffffff",
          colorInputBackground: "#f2f4f4",
          colorInputText: "#191c1d",
          colorText: "#191c1d",
          colorTextSecondary: "#40484a",
          colorTextOnPrimaryBackground: "#ffffff",
          colorDanger: "#ba1a1a",
          colorSuccess: "#006d2f",
          colorNeutral: "#191c1d",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-white border border-[#bfc8ca] shadow-lg",
          headerTitle: "font-manrope text-[#00333c]",
          headerSubtitle: "text-[#40484a]",
          formButtonPrimary: "bg-[#00333c] hover:bg-[#004B57] text-white",
          formFieldLabel: "text-[#40484a]",
          formFieldInput: "bg-[#f2f4f4] border-[#bfc8ca] text-[#191c1d]",
          footerActionLink: "text-[#00333c] hover:text-[#004B57]",
          socialButtonsBlockButton: "bg-white border-[#bfc8ca] text-[#191c1d] hover:bg-[#f2f4f4]",
          dividerLine: "bg-[#bfc8ca]",
          badge: "bg-[#5dfd8a]/20 text-[#006d2f]",
          avatarBox: "bg-[#004B57]",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
            rel="stylesheet"
          />
        </head>
        <body style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa" }}>
          {children}
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
