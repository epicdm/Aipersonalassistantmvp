import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/app/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
          colorPrimary: "#6366f1",
          colorBackground: "#111111",
          colorInputBackground: "#1a1a1a",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#a1a1aa",
          colorTextOnPrimaryBackground: "#ffffff",
          colorDanger: "#ef4444",
          colorSuccess: "#22c55e",
          colorWarning: "#f59e0b",
          colorNeutral: "#ffffff",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-[#111111] border border-gray-800 shadow-2xl",
          headerTitle: "text-white",
          headerSubtitle: "text-gray-400",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white",
          formFieldLabel: "text-gray-300",
          formFieldInput: "bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500",
          footerActionLink: "text-indigo-400 hover:text-indigo-300",
          footerActionText: "text-gray-400",
          socialButtonsBlockButton: "bg-[#1a1a1a] border-gray-700 text-white hover:bg-[#222222]",
          socialButtonsBlockButtonText: "text-white",
          dividerLine: "bg-gray-700",
          dividerText: "text-gray-500",
          identityPreviewText: "text-white",
          identityPreviewEditButton: "text-indigo-400",
          formFieldInputShowPasswordButton: "text-gray-400",
          otpCodeFieldInput: "bg-[#1a1a1a] border-gray-700 text-white",
          formResendCodeLink: "text-indigo-400",
          alert: "bg-red-900/30 border-red-800 text-red-300",
          alertText: "text-red-300",
          badge: "bg-indigo-900/30 text-indigo-300",
          avatarBox: "bg-indigo-600",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
