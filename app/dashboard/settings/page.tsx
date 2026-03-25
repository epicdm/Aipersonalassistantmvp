"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <DashboardShell>
      <div
        className="min-h-screen"
        style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", color: "#191c1d" }}
        dangerouslySetInnerHTML={{ __html: `<!-- TopAppBar Shell -->
<header class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 dark:bg-[#00333c]/80 backdrop-blur-md shadow-sm dark:shadow-none">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full overflow-hidden bg-surface-container">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Professional headshot of a young male entrepreneur with a clean background and soft studio lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAd1a-uaBGTXi1p33WlSyk1oQ1j-RfeBqNZU8EZ8Q610UTbEsmsqAVe59dSERLzpIsQh_E80oZPXHs--7Y28l3mXEzSENjROPhj-meK_BtTew52VAiW47DpHH7txT4Buj5etrKrRkMYTWoJjrHloURYWIQZytHzZt6K2elpWGSarfBcRY9PNhw8WuKeGYMcoqWuMDwz06WomCSUHcOHC0tjE-eahRhfbswEn_H8-6iQlgFh_oCOLHO-tK2l5tPHbkgCf9NCrVb9Rvg"/>
</div>
<h1 class="font-manrope font-bold text-xl tracking-tight text-[#004b57] dark:text-[#5dfd8a]">Settings</h1>
</div>
<button class="text-[#191c1d]/60 dark:text-[#bfc8ca] hover:bg-[#f2f4f4] dark:hover:bg-[#004b57]/50 transition-colors active:scale-95 duration-200 p-2 rounded-full">
<span class="material-symbols-outlined">settings</span>
</button>
<div class="absolute bottom-0 left-0 bg-[#f2f4f4] dark:bg-[#191c1d] h-[1px] w-full"></div>
</header>
<main class="pt-24 px-6 space-y-8 max-w-md mx-auto">
<!-- Subscription Plan Bento Card -->
<section class="relative overflow-hidden bg-gradient-to-br from-primary to-primary-container p-6 rounded-xl text-on-primary shadow-lg">
<div class="relative z-10 flex flex-col gap-4">
<div class="flex justify-between items-start">
<div>
<p class="font-label text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">Current Plan</p>
<h2 class="font-headline text-2xl font-extrabold">Pro Tier</h2>
</div>
<span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>
</div>
<div class="mt-4 space-y-3">
<div class="flex justify-between text-sm opacity-90">
<span>Monthly Usage</span>
<span>84%</span>
</div>
<div class="h-2 w-full bg-white/20 rounded-full overflow-hidden">
<div class="h-full bg-secondary-fixed w-[84%] rounded-full shadow-[0_0_10px_#66ff8e]"></div>
</div>
<p class="text-[11px] opacity-70 italic text-right">Resetting in 12 days</p>
</div>
<div class="pt-4 flex gap-3">
<button class="flex-1 bg-secondary-container text-on-secondary-container py-3 rounded-lg font-bold text-sm active:scale-95 transition-transform">
                        Upgrade
                    </button>
<button class="flex-1 bg-white/10 border border-white/20 py-3 rounded-lg font-bold text-sm backdrop-blur-sm active:scale-95 transition-transform">
                        Manage
                    </button>
</div>
</div>
<!-- Decorative Grain/Shape -->
<div class="absolute -right-12 -bottom-12 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
</section>
<!-- Usage Meters - Glassmorphism -->
<section class="grid grid-cols-2 gap-4">
<div class="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2">
<span class="material-symbols-outlined text-secondary-fixed-dim" style="font-variation-settings: 'FILL' 1;">chat</span>
<p class="text-on-surface-variant text-xs font-medium">Messages</p>
<h3 class="font-headline text-xl font-bold">12,402</h3>
<p class="text-[10px] text-secondary font-semibold">+12% vs last month</p>
</div>
<div class="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2">
<span class="material-symbols-outlined text-primary-fixed-dim" style="font-variation-settings: 'FILL' 1;">smart_toy</span>
<p class="text-on-surface-variant text-xs font-medium">AI Tokens</p>
<h3 class="font-headline text-xl font-bold">840k</h3>
<p class="text-[10px] text-error font-semibold">Limited speed soon</p>
</div>
</section>
<!-- Platform Settings List -->
<section class="space-y-6">
<div class="flex items-center justify-between">
<h3 class="font-headline text-lg font-bold text-primary">Platform Status</h3>
<span class="text-xs text-on-surface-variant underline cursor-pointer">View Docs</span>
</div>
<div class="space-y-4">
<!-- Status Row -->
<div class="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary">
<span class="material-symbols-outlined">chat</span>
</div>
<div>
<p class="text-sm font-bold">WhatsApp Number</p>
<p class="text-xs text-on-surface-variant">+1 (555) 0123-456</p>
</div>
</div>
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></div>
<span class="text-xs font-semibold text-secondary">Online</span>
</div>
</div>
<!-- Webhook Row -->
<div class="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container">
<span class="material-symbols-outlined">webhook</span>
</div>
<div>
<p class="text-sm font-bold">API Webhooks</p>
<p class="text-xs text-on-surface-variant">3 Active Endpoints</p>
</div>
</div>
<button class="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors">
<span class="material-symbols-outlined">chevron_right</span>
</button>
</div>
<!-- Security Row -->
<div class="bg-surface-container-low p-4 rounded-xl flex items-center justify-between">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary">
<span class="material-symbols-outlined">vpn_key</span>
</div>
<div>
<p class="text-sm font-bold">Access Keys</p>
<p class="text-xs text-on-surface-variant">Last rotated 2d ago</p>
</div>
</div>
<button class="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors">
<span class="material-symbols-outlined">chevron_right</span>
</button>
</div>
</div>
</section>
<!-- Danger Zone -->
<section class="pt-4 border-t-0">
<div class="bg-error-container/20 p-6 rounded-xl border border-error/10">
<h4 class="text-error font-bold text-sm mb-2">Danger Zone</h4>
<p class="text-xs text-on-surface-variant mb-4">Once you delete your account, there is no going back. Please be certain.</p>
<button class="text-error font-bold text-xs flex items-center gap-2 hover:bg-error-container/40 px-3 py-2 rounded-lg transition-colors">
<span class="material-symbols-outlined text-sm">delete_forever</span>
                    Terminate Professional Service
                </button>
</div>
</section>
</main>
<!-- BottomNavBar Shell -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white dark:bg-[#00333c] shadow-2xl rounded-t-2xl">
<div class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] dark:hover:text-[#66ff8e] transition-all transform duration-300 ease-in-out">
<span class="material-symbols-outlined">home</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider">Home</span>
</div>
<div class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] dark:hover:text-[#66ff8e] transition-all transform duration-300 ease-in-out">
<span class="material-symbols-outlined">smart_toy</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider">Agents</span>
</div>
<div class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] dark:hover:text-[#66ff8e] transition-all transform duration-300 ease-in-out">
<span class="material-symbols-outlined">auto_stories</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider">Knowledge</span>
</div>
<div class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] dark:hover:text-[#66ff8e] transition-all transform duration-300 ease-in-out">
<span class="material-symbols-outlined">chat</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider">Chats</span>
</div>
</nav>
<!-- FAB Suppression: Contextually suppressed as per mandate for Settings/Profile screens -->` }}
      />
    </DashboardShell>
  );
}