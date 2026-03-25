"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
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
        dangerouslySetInnerHTML={{ __html: `<!-- Top AppBar (JSON Driven) -->
<header class="bg-[#f8f9fa] sticky top-0 z-40 flex justify-between items-center w-full px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Professional portrait of a young businesswoman with a warm smile in a brightly lit modern office setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsQbEQF_tQaCclnYlFsHkdwRpsCiHNJgJIWqxU7WAq3KbyqAd8AnTWFTsIsSmWmnywPFPhwMEkj0k7M86Z3YJeDLfeW4tI7WELM_sd7hnwD3h2Wl1Nqt6hEVvMczWGvzD_Z--On28RnL9PePE7_XOZzUtQYR_ebrAf1eddmrZCF41lJHN8mGzWIGp37J19WhR1cJ8oAYoO7vshRS4EVoZPoFQ2o7zN5tjvgYI8vcYQ4sIIJmegsrM6kuecb5A3ZBicFDY8_uyCvus"/>
</div>
<span class="text-[#004B57] font-manrope font-bold text-lg tracking-tight">Nexus AI</span>
</div>
<button class="text-[#004B57] p-2 hover:bg-[#e7e8e9] transition-colors rounded-full flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
</header>
<main class="max-w-4xl mx-auto px-6 pt-8 space-y-10">
<!-- Header: Personalized Greeting -->
<section class="space-y-2">
<h1 class="font-headline font-extrabold text-4xl text-primary tracking-tight">Good morning, ${window.__bff_user || 'there'}</h1>
<p class="text-on-surface-variant text-lg max-w-lg leading-relaxed">
                Your AI assistant handled <span class="text-secondary font-bold">142 inquiries</span> while you slept. Here is what needs your attention now.
            </p>
</section>
<!-- Urgent Action Cards (Bento Style) -->
<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
<!-- Urgent Chat Card -->
<div class="bg-gradient-primary p-6 rounded-xl flex flex-col justify-between min-h-[160px] text-white shadow-lg">
<div class="flex justify-between items-start">
<span class="material-symbols-outlined text-secondary-fixed" data-icon="forum">forum</span>
<span class="bg-error px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Urgent</span>
</div>
<div>
<h3 class="font-headline font-bold text-2xl tracking-tight leading-none">3 Escalated</h3>
<p class="text-on-primary-container text-sm mt-1">Chats waiting for human input</p>
</div>
</div>
<!-- Wallet Card -->
<div class="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between min-h-[160px] shadow-sm">
<div class="flex justify-between items-start">
<span class="material-symbols-outlined text-error" data-icon="account_balance_wallet">account_balance_wallet</span>
</div>
<div>
<div class="flex items-baseline gap-1">
<h3 class="font-headline font-bold text-2xl tracking-tight text-on-surface">$14.50</h3>
<span class="text-error text-[10px] font-bold uppercase">Low</span>
</div>
<p class="text-on-surface-variant text-sm mt-1">Wallet balance remaining</p>
</div>
</div>
<!-- System Health Card -->
<div class="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between min-h-[160px] shadow-sm">
<div class="flex justify-between items-start">
<span class="material-symbols-outlined text-on-tertiary-container" data-icon="dns">dns</span>
</div>
<div>
<h3 class="font-headline font-bold text-2xl tracking-tight text-on-surface">1 Degraded</h3>
<p class="text-on-surface-variant text-sm mt-1">Shopify API response time slow</p>
</div>
</div>
</section>
<!-- Performance Snapshot -->
<section class="space-y-6">
<h2 class="font-headline font-bold text-xl text-on-surface-variant flex items-center gap-2">
                Performance Snapshot
                <span class="h-px flex-1 bg-outline-variant/20"></span>
</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
<!-- Total Messages Sparkline -->
<div class="bg-surface-container-low p-6 rounded-xl space-y-4">
<div class="flex justify-between items-end">
<div>
<p class="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Total Messages</p>
<h4 class="text-3xl font-headline font-extrabold text-primary">2,841</h4>
</div>
<div class="text-right">
<span class="text-secondary font-bold text-sm">+12%</span>
</div>
</div>
<div class="h-16 w-full flex items-end gap-1">
<div class="flex-1 bg-primary/10 h-1/3 rounded-t-sm"></div>
<div class="flex-1 bg-primary/10 h-2/3 rounded-t-sm"></div>
<div class="flex-1 bg-primary/10 h-1/2 rounded-t-sm"></div>
<div class="flex-1 bg-primary/10 h-3/4 rounded-t-sm"></div>
<div class="flex-1 bg-primary/10 h-2/3 rounded-t-sm"></div>
<div class="flex-1 bg-primary h-full rounded-t-sm"></div>
<div class="flex-1 bg-primary/50 h-5/6 rounded-t-sm"></div>
</div>
</div>
<!-- Conversion Rate Sparkline -->
<div class="bg-surface-container-low p-6 rounded-xl space-y-4">
<div class="flex justify-between items-end">
<div>
<p class="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Lead Conversion</p>
<h4 class="text-3xl font-headline font-extrabold text-primary">18.4%</h4>
</div>
<div class="text-right">
<span class="text-secondary font-bold text-sm">+4.2%</span>
</div>
</div>
<div class="h-16 w-full flex items-end gap-1">
<div class="flex-1 bg-secondary/10 h-1/2 rounded-t-sm"></div>
<div class="flex-1 bg-secondary/10 h-2/3 rounded-t-sm"></div>
<div class="flex-1 bg-secondary/10 h-1/3 rounded-t-sm"></div>
<div class="flex-1 bg-secondary/10 h-1/2 rounded-t-sm"></div>
<div class="flex-1 bg-secondary/10 h-2/3 rounded-t-sm"></div>
<div class="flex-1 bg-secondary h-full rounded-t-sm"></div>
<div class="flex-1 bg-secondary/50 h-3/4 rounded-t-sm"></div>
</div>
</div>
</div>
</section>
<!-- Recent Activity Feed -->
<section class="space-y-6">
<div class="flex justify-between items-center">
<h2 class="font-headline font-bold text-xl text-on-surface-variant">Recent Activity</h2>
<button class="text-primary font-semibold text-sm hover:underline">View All</button>
</div>
<div class="space-y-3">
<!-- Activity Item 1 -->
<div class="bg-surface-container-lowest p-5 rounded-xl flex items-center gap-5 group transition-all hover:bg-surface-container-low">
<div class="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
<span class="material-symbols-outlined" data-icon="person_add">person_add</span>
</div>
<div class="flex-1">
<p class="text-on-surface font-semibold">New Lead captured from WhatsApp</p>
<p class="text-on-surface-variant text-sm">Customer "Julian R." interested in Spring Collection</p>
</div>
<span class="text-on-surface-variant text-xs font-medium">2m ago</span>
</div>
<!-- Activity Item 2 -->
<div class="bg-surface-container-lowest p-5 rounded-xl flex items-center gap-5 group transition-all hover:bg-surface-container-low">
<div class="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
<span class="material-symbols-outlined" data-icon="sync">sync</span>
</div>
<div class="flex-1">
<p class="text-on-surface font-semibold">Shopify Catalog Synced</p>
<p class="text-on-surface-variant text-sm">48 new products and prices updated successfully</p>
</div>
<span class="text-on-surface-variant text-xs font-medium">45m ago</span>
</div>
<!-- Activity Item 3 -->
<div class="bg-surface-container-lowest p-5 rounded-xl flex items-center gap-5 group transition-all hover:bg-surface-container-low">
<div class="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
<span class="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
</div>
<div class="flex-1">
<p class="text-on-surface font-semibold">AI Auto-Response Optimized</p>
<p class="text-on-surface-variant text-sm">Refined delivery timeframe answers based on recent logs</p>
</div>
<span class="text-on-surface-variant text-xs font-medium">1h ago</span>
</div>
</div>
</section>
</main>
<!-- Floating Action Button -->
<button class="fixed bottom-24 right-6 bg-gradient-primary text-white p-4 rounded-full shadow-2xl ai-pulse-glow flex items-center gap-2 z-50 group hover:scale-105 transition-transform active:scale-95">
<span class="material-symbols-outlined" data-icon="bolt" data-weight="fill">bolt</span>
<span class="font-headline font-bold text-sm pr-2">Talk to My AI</span>
</button>
<!-- Bottom Navigation Bar (JSON Driven) -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-xl border-t border-[#bfc8ca]/15 shadow-[0_-10px_40px_rgba(25,28,29,0.04)] rounded-t-3xl">
<!-- Home (Active) -->
<a class="flex flex-col items-center justify-center bg-[#004B57] text-white rounded-2xl px-5 py-2 transition-transform duration-300 ease-out" href="/dashboard">
<span class="material-symbols-outlined" data-icon="home" data-weight="fill">home</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Home</span>
</a>
<!-- Channels -->
<a class="flex flex-col items-center justify-center text-[#404849] px-5 py-2 hover:text-[#004B57] transition-colors" href="/dashboard/conversations">
<span class="material-symbols-outlined" data-icon="chat_bubble">chat_bubble</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Channels</span>
</a>
<!-- Analytics -->
<a class="flex flex-col items-center justify-center text-[#404849] px-5 py-2 hover:text-[#004B57] transition-colors" href="/dashboard/billing">
<span class="material-symbols-outlined" data-icon="insights">insights</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Analytics</span>
</a>
<!-- Management -->
<a class="flex flex-col items-center justify-center text-[#404849] px-5 py-2 hover:text-[#004B57] transition-colors" href="/dashboard/settings">
<span class="material-symbols-outlined" data-icon="settings_suggest">settings_suggest</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Management</span>
</a>
</nav>` }}
      />
    </DashboardShell>
  );
}