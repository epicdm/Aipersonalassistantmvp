import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "sonner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BFF — AI Personal Assistant",
  description: "Your AI, Your Rules. Create AI agents that work for your business.",
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#E2725B",
          colorBackground: "#050505",
          colorInputBackground: "#111111",
          colorInputText: "#FAFAFA",
          colorText: "#FAFAFA",
          colorTextSecondary: "#A1A1AA",
          colorTextOnPrimaryBackground: "#FAFAFA",
          colorDanger: "#ef4444",
          colorSuccess: "#22c55e",
          colorWarning: "#f59e0b",
          colorNeutral: "#ffffff",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-[#111111] border border-white/10 shadow-2xl",
          headerTitle: "text-white font-serif",
          headerSubtitle: "text-[#A1A1AA]",
          formButtonPrimary: "bg-[#E2725B] hover:bg-[#F48B76] text-white",
          formFieldLabel: "text-[#A1A1AA]",
          formFieldInput: "bg-[#111111] border-white/10 text-white placeholder:text-[#A1A1AA]",
          footerActionLink: "text-[#E2725B] hover:text-[#F48B76]",
          footerActionText: "text-[#A1A1AA]",
          socialButtonsBlockButton: "bg-[#1A1A1A] border-white/10 text-white hover:bg-[#222222]",
          socialButtonsBlockButtonText: "text-white",
          dividerLine: "bg-white/10",
          dividerText: "text-[#A1A1AA]",
          identityPreviewText: "text-white",
          identityPreviewEditButton: "text-[#E2725B]",
          formFieldInputShowPasswordButton: "text-[#A1A1AA]",
          otpCodeFieldInput: "bg-[#1A1A1A] border-white/10 text-white",
          formResendCodeLink: "text-[#E2725B]",
          alert: "bg-red-900/30 border-red-800 text-red-300",
          alertText: "text-red-300",
          badge: "bg-[#E2725B]/20 text-[#E2725B]",
          avatarBox: "bg-[#E2725B]",
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Figtree:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        </head>
        <body className={`${geistMono.variable} antialiased dark`} style={{ fontFamily: 'Figtree, system-ui, sans-serif', backgroundColor: '#050505' }}>
            {children}
            <Toaster richColors theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  );
}
