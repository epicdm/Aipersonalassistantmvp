"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BroadcastsPage() {
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
        dangerouslySetInnerHTML={{ __html: `<!-- Top Navigation -->
<header class="fixed top-0 left-0 right-0 z-50 bg-[#f8f9fa] dark:bg-slate-950 flex justify-between items-center w-full px-6 py-4 max-w-full">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
<span class="material-symbols-outlined" data-icon="account_circle">account_circle</span>
</div>
<span class="font-headline text-2xl font-bold tracking-tight text-[#004B57]">The Digital Concierge</span>
</div>
<nav class="hidden md:flex items-center gap-8">
<a class="text-[#004B57] font-bold border-b-2 border-[#5dfd8a] font-label text-sm uppercase tracking-wider" href="#">Performance</a>
<a class="text-slate-500 hover:bg-[#e7e8e9] px-3 py-1 rounded transition-colors font-label text-sm uppercase tracking-wider" href="#">Archive</a>
<a class="text-slate-500 hover:bg-[#e7e8e9] px-3 py-1 rounded transition-colors font-label text-sm uppercase tracking-wider" href="#">Workflows</a>
<a class="text-slate-500 hover:bg-[#e7e8e9] px-3 py-1 rounded transition-colors font-label text-sm uppercase tracking-wider" href="#">Billing</a>
</nav>
<button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7e8e9] transition-transform active:scale-90">
<span class="material-symbols-outlined text-on-surface-variant" data-icon="settings">settings</span>
</button>
</header>
<!-- Sidebar for Web -->
<aside class="fixed left-0 top-0 h-full w-64 z-40 flex flex-col hidden md:flex bg-white/80 backdrop-blur-xl shadow-2xl pt-24">
<div class="px-6 mb-8">
<div class="flex flex-col gap-1">
<span class="font-headline font-black text-[#004B57] text-xl">Nexus Admin</span>
<span class="text-xs font-medium text-slate-500">Professional Tier • v2.4.0</span>
</div>
</div>
<nav class="flex flex-col gap-2">
<a class="bg-[#5dfd8a] text-[#007232] rounded-lg mx-2 flex items-center gap-3 px-4 py-3 font-inter text-sm font-medium transition-transform hover:translate-x-1" href="#">
<span class="material-symbols-outlined" data-icon="monitoring">monitoring</span>
                Performance
            </a>
<a class="text-slate-600 hover:bg-slate-100 rounded-lg mx-2 flex items-center gap-3 px-4 py-3 font-inter text-sm font-medium transition-transform hover:translate-x-1" href="#">
<span class="material-symbols-outlined" data-icon="history">history</span>
                Archive
            </a>
<a class="text-slate-600 hover:bg-slate-100 rounded-lg mx-2 flex items-center gap-3 px-4 py-3 font-inter text-sm font-medium transition-transform hover:translate-x-1" href="#">
<span class="material-symbols-outlined" data-icon="account_tree">account_tree</span>
                Workflows
            </a>
<a class="text-slate-600 hover:bg-slate-100 rounded-lg mx-2 flex items-center gap-3 px-4 py-3 font-inter text-sm font-medium transition-transform hover:translate-x-1" href="#">
<span class="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
                Billing
            </a>
</nav>
</aside>
<!-- Main Content Canvas -->
<main class="pt-24 pb-32 md:pl-64 min-h-screen">
<div class="max-w-6xl mx-auto px-6 md:px-12 space-y-12">
<!-- Hero Insight Section -->
<section class="mt-8">
<div class="flex items-center gap-3 mb-4">
<span class="w-2 h-2 rounded-full bg-secondary ai-pulse"></span>
<span class="text-secondary font-semibold uppercase tracking-widest text-xs">Live Intelligence Brief</span>
</div>
<h1 class="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight max-w-3xl">
                    Yesterday, I handled <span class="text-[#004B57] underline decoration-[#5dfd8a] decoration-4 underline-offset-8">450 chats</span> and captured <span class="text-[#004B57] underline decoration-[#5dfd8a] decoration-4 underline-offset-8">24 new leads</span> for your business.
                </h1>
</section>
<!-- Bento Grid Metrics -->
<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
<!-- Resolution Rate -->
<div class="bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,29,0.06)] flex flex-col justify-between h-48 group hover:translate-y-[-4px] transition-transform duration-300">
<div class="flex justify-between items-start">
<span class="text-on-surface-variant text-sm font-medium font-label uppercase tracking-wider">Resolution Rate</span>
<span class="material-symbols-outlined text-primary opacity-20 group-hover:opacity-100 transition-opacity" data-icon="verified_user">verified_user</span>
</div>
<div class="flex items-baseline gap-2">
<span class="text-5xl font-headline font-extrabold text-primary">92%</span>
<span class="text-secondary font-bold text-sm">Target Met</span>
</div>
</div>
<!-- Lead Conversion -->
<div class="bg-gradient-to-br from-primary to-primary-container p-8 rounded-xl shadow-[0_20px_40px_rgba(0,51,60,0.1)] flex flex-col justify-between h-48 text-on-primary group hover:translate-y-[-4px] transition-transform duration-300">
<div class="flex justify-between items-start">
<span class="text-on-primary-container text-sm font-medium font-label uppercase tracking-wider">Lead Conversion</span>
<span class="material-symbols-outlined text-secondary-fixed ai-pulse" data-icon="trending_up">trending_up</span>
</div>
<div class="flex flex-col">
<span class="text-5xl font-headline font-extrabold">+12%</span>
<span class="text-secondary-fixed text-sm font-medium">vs. yesterday average</span>
</div>
</div>
<!-- Time Saved -->
<div class="bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(25,28,29,0.06)] flex flex-col justify-between h-48 group hover:translate-y-[-4px] transition-transform duration-300">
<div class="flex justify-between items-start">
<span class="text-on-surface-variant text-sm font-medium font-label uppercase tracking-wider">Time Saved</span>
<span class="material-symbols-outlined text-primary opacity-20 group-hover:opacity-100 transition-opacity" data-icon="schedule">schedule</span>
</div>
<div class="flex flex-col">
<span class="text-5xl font-headline font-extrabold text-primary">18.5h</span>
<span class="text-on-surface-variant text-sm">Human hours recovered</span>
</div>
</div>
</section>
<!-- Anomaly & Action Section (Asymmetric Layout) -->
<section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
<!-- Anomaly Card -->
<div class="lg:col-span-7 bg-surface-container-low p-10 rounded-xl relative overflow-hidden">
<div class="absolute top-0 right-0 w-32 h-32 bg-[#5dfd8a]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
<div class="relative z-10 space-y-6">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-secondary" data-icon="warning">warning</span>
<span class="text-primary font-bold font-headline text-lg">Anomaly Detected</span>
</div>
<p class="text-on-surface-variant text-xl leading-relaxed font-body italic">
                            "I noticed a surge in queries about <span class="text-primary font-bold">'International Shipping'</span> between 2 PM and 4 PM yesterday. Customers are specifically asking about EU delivery windows."
                        </p>
<div class="pt-4 flex gap-4">
<div class="flex -space-x-2">
<img class="w-8 h-8 rounded-full border-2 border-surface" data-alt="professional female customer representative portrait with neutral background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7Tdttd5bYpK4PSKo9DhLwnf0bFQbUBVjvFoSNTiLPWQWzmKBaQ1a2f7bcKt2_sIpVg77fMnWQ2Mh29TYJji9JyV4aF5iI3cbBiDYmA1zBLwZT0YfwUoP5YcAMB1acGWvQ3uzhUMiUj0lGbM0ru4fxazsVwRI3dtUeSLjrexrspgMsRNaDH4BoI8bV3-U3xG1iBXh3slaAR2G5I_pY9IvziRflEzm7sFNHzuIiWAsxE6J4zY2DxsOKdDk5vxV7kaytAKVdj_-UDP0"/>
<img class="w-8 h-8 rounded-full border-2 border-surface" data-alt="modern businessman in professional setting looking confident" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1e5It7GR06h-NZLDn9_D7rC-lIOC5rY8dG8AD1Che9BqF1dQlgFT2y4Qq84uuiojgS2rYUWKb9QHBV99yHFp6UignFEUjq6CpKNvJ9TF1WfbPZQJY-BxR4bO8tW3N5RiU-O3c-YR0FZxceHYA-IkjBKOEweY4hMfj2vVrXSrKIm7PUAo7YRl3_mNAnvLDDkT3eAzq3K9L4eOblDKBOFpivh8t6kkSo0O5b6UBKs1m487h8fzc6fllwEMJ9TLkfZOZE27AbQbjB_A"/>
<div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container border-2 border-surface">+142</div>
</div>
<span class="text-sm text-on-surface-variant self-center">Identified in 142 distinct sessions</span>
</div>
</div>
</div>
<!-- Action Suggestion (Glassmorphism) -->
<div class="lg:col-span-5 glass-panel p-8 rounded-xl border border-white/20 shadow-xl space-y-6">
<div class="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
<span class="material-symbols-outlined text-secondary" data-icon="lightbulb">lightbulb</span>
</div>
<h3 class="text-primary font-headline text-2xl font-bold">Actionable Suggestion</h3>
<p class="text-on-surface-variant leading-snug">
                        Would you like me to update the Knowledge Base with our new shipping protocols? I can automate responses for these new queries immediately.
                    </p>
<div class="flex flex-col gap-3 pt-4">
<button class="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 px-6 rounded-lg font-bold flex items-center justify-center gap-2 group transition-all hover:shadow-lg active:scale-95">
                            Confirm Update
                            <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
</button>
<button class="w-full text-on-surface-variant py-4 px-6 rounded-lg font-medium hover:bg-surface-container-high transition-colors">
                            I'll handle it manually
                        </button>
</div>
</div>
</section>
<!-- Usage Trend / Visual Anchor -->
<section class="bg-surface-container-lowest rounded-2xl p-1 shadow-sm">
<div class="p-8 space-y-8">
<div class="flex justify-between items-end">
<div>
<h2 class="text-primary font-headline text-2xl font-bold">Usage Patterns</h2>
<p class="text-on-surface-variant text-sm">Activity density across the last 24 hours</p>
</div>
<div class="flex gap-2">
<span class="px-3 py-1 bg-surface-container rounded-full text-xs font-bold text-primary">Live</span>
<span class="px-3 py-1 bg-secondary-container/30 text-secondary rounded-full text-xs font-bold">Peak High</span>
</div>
</div>
<!-- Decorative Visual Rep of Data -->
<div class="h-48 w-full flex items-end gap-1 px-2">
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[40%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[35%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[45%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[60%]"></div>
<div class="flex-1 bg-primary/20 rounded-t-sm h-[75%]"></div>
<div class="flex-1 bg-primary/40 rounded-t-sm h-[85%]"></div>
<div class="flex-1 bg-secondary rounded-t-sm h-[100%]"></div>
<div class="flex-1 bg-primary/60 rounded-t-sm h-[90%]"></div>
<div class="flex-1 bg-primary/40 rounded-t-sm h-[65%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[40%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[30%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[25%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[35%]"></div>
<div class="flex-1 bg-surface-container-low rounded-t-sm h-[50%]"></div>
</div>
</div>
</section>
</div>
</main>
<!-- Bottom Navigation for Mobile -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 md:hidden bg-white/90 backdrop-blur-md shadow-[0_-10px_30px_rgba(25,28,29,0.04)] border-t border-slate-100 rounded-t-2xl">
<a class="flex flex-col items-center justify-center bg-gradient-to-br from-[#00333c] to-[#004b57] text-white rounded-xl px-4 py-1 transition-transform active:scale-95 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="dashboard">dashboard</span>
<span class="font-inter text-[10px] uppercase tracking-widest mt-1">Daily</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 hover:text-[#004B57] transition-transform active:scale-95 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="search">search</span>
<span class="font-inter text-[10px] uppercase tracking-widest mt-1">Search</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 hover:text-[#004B57] transition-transform active:scale-95 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="schema">schema</span>
<span class="font-inter text-[10px] uppercase tracking-widest mt-1">Logic</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400 hover:text-[#004B57] transition-transform active:scale-95 duration-150" href="#">
<span class="material-symbols-outlined" data-icon="speed">speed</span>
<span class="font-inter text-[10px] uppercase tracking-widest mt-1">Usage</span>
</a>
</nav>` }}
      />
    </DashboardShell>
  );
}