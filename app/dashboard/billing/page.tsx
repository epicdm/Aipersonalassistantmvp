"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BillingPage() {
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
        dangerouslySetInnerHTML={{ __html: `<!-- TopAppBar -->
<header class="bg-slate-50 dark:bg-slate-950 flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 transition-colors">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden">
<img alt="Business Owner Profile" class="w-full h-full object-cover" data-alt="Professional headshot of a business executive in a tailored suit against a clean, modern office backdrop with soft lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJ1-A2D4skU26mcoIzzc92SCie3bNRmLRDqnD-sn5IHfdWjtTAY7vb67reyf4ZbExjBf0GjL68HSf5hnKkwaWaaHIE6hEeh9NfAMc92qJ1QonXw0m9Hj2MH8EBWqp1zWjZHTHPb0502nlM3pkm9NNkAjnfJEpO1JiJmxDOxefa5tYvM9t0KwlD0jESWf49LxPXV03gvvUkUJ9E9XEML3jSUKEPINSuik193dLQf8h4AFRTYM_HUzNxHr9tXoV-5o4Z4RIbjnF1bpY"/>
</div>
<span class="font-manrope font-bold text-cyan-950 dark:text-white text-xl tracking-tight">The Digital Concierge</span>
</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
<span class="material-symbols-outlined text-cyan-900 dark:text-cyan-400" data-icon="notifications">notifications</span>
</button>
</header>
<main class="mt-20 px-6 pt-8 space-y-8">
<!-- Balance Card (Prominent Bento Style) -->
<section class="relative overflow-hidden bg-gradient-primary rounded-xl p-8 shadow-[0_20px_40px_rgba(0,51,60,0.12)]">
<div class="relative z-10 flex flex-col gap-1">
<span class="font-label text-on-primary-container uppercase tracking-widest text-xs font-bold opacity-80">Available Balance</span>
<div class="flex items-baseline gap-2">
<span class="font-headline text-on-primary text-4xl font-extrabold tracking-tighter">$4,285.50</span>
<span class="text-secondary-fixed font-semibold text-sm">+2.4% this week</span>
</div>
<div class="mt-8 flex gap-3">
<button class="flex-1 bg-secondary-container text-on-secondary-container font-headline font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95">
<span class="material-symbols-outlined text-lg" data-icon="add_card">add_card</span>
                        Add Funds
                    </button>
<button class="flex-1 bg-white/10 backdrop-blur-md text-on-primary font-headline font-bold py-3 px-4 rounded-lg border border-white/10 flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95">
<span class="material-symbols-outlined text-lg" data-icon="send">send</span>
                        Send Top-up
                    </button>
</div>
</div>
<!-- Decorative Glass Sphere -->
<div class="absolute -right-12 -top-12 w-48 h-48 bg-secondary-fixed/10 rounded-full blur-3xl"></div>
<div class="absolute -left-12 -bottom-12 w-48 h-48 bg-primary-container/40 rounded-full blur-3xl"></div>
</section>
<!-- Quick Integration Stats -->
<div class="grid grid-cols-2 gap-4">
<div class="bg-surface-container-low p-5 rounded-xl space-y-2">
<div class="flex items-center gap-2 text-on-surface-variant">
<span class="material-symbols-outlined text-sm" data-icon="settings_ethernet">settings_ethernet</span>
<span class="text-xs font-semibold uppercase tracking-wider">Reloadly Status</span>
</div>
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-secondary ai-pulse"></div>
<span class="font-headline font-bold text-primary">Connected</span>
</div>
</div>
<div class="bg-surface-container-low p-5 rounded-xl space-y-2">
<div class="flex items-center gap-2 text-on-surface-variant">
<span class="material-symbols-outlined text-sm" data-icon="group">group</span>
<span class="text-xs font-semibold uppercase tracking-wider">Active Credits</span>
</div>
<div class="font-headline font-bold text-primary">12 Countries</div>
</div>
</div>
<!-- Recent Transactions Section -->
<section class="space-y-6">
<div class="flex justify-between items-end">
<h2 class="font-headline text-2xl font-extrabold text-primary tracking-tight">Recent Activity</h2>
<button class="text-secondary font-bold text-sm hover:underline">View History</button>
</div>
<div class="space-y-4">
<!-- Transaction Item 1 -->
<div class="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between shadow-sm">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
<span class="material-symbols-outlined text-secondary" data-icon="add_circle" style="font-variation-settings: 'FILL' 1;">add_circle</span>
</div>
<div>
<p class="font-headline font-bold text-on-surface">Top-up Wallet</p>
<p class="text-xs text-on-surface-variant">via Stripe • Oct 24, 14:20</p>
</div>
</div>
<div class="text-right">
<p class="font-headline font-extrabold text-secondary">+$500.00</p>
<span class="text-[10px] px-2 py-0.5 bg-secondary-container/30 text-secondary rounded-full font-bold uppercase tracking-tighter">Success</span>
</div>
</div>
<!-- Transaction Item 2 -->
<div class="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between shadow-sm">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
<span class="material-symbols-outlined text-primary" data-icon="smartphone">smartphone</span>
</div>
<div>
<p class="font-headline font-bold text-on-surface">Airtime Sent</p>
<p class="text-xs text-on-surface-variant">+234 810 000... • Oct 23, 09:15</p>
</div>
</div>
<div class="text-right">
<p class="font-headline font-extrabold text-primary">-$15.50</p>
<span class="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full font-bold uppercase tracking-tighter">Completed</span>
</div>
</div>
<!-- Transaction Item 3 -->
<div class="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between shadow-sm">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
<span class="material-symbols-outlined text-primary" data-icon="router">router</span>
</div>
<div>
<p class="font-headline font-bold text-on-surface">Data Bundle</p>
<p class="text-xs text-on-surface-variant">+44 7911 00... • Oct 22, 18:42</p>
</div>
</div>
<div class="text-right">
<p class="font-headline font-extrabold text-primary">-$25.00</p>
<span class="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full font-bold uppercase tracking-tighter">Completed</span>
</div>
</div>
<!-- Transaction Item 4 -->
<div class="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between shadow-sm opacity-80">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
<span class="material-symbols-outlined text-error" data-icon="error_outline">error_outline</span>
</div>
<div>
<p class="font-headline font-bold text-on-surface">Top-up Wallet</p>
<p class="text-xs text-on-surface-variant">Declined • Oct 21, 11:30</p>
</div>
</div>
<div class="text-right">
<p class="font-headline font-extrabold text-on-surface-variant">$200.00</p>
<span class="text-[10px] px-2 py-0.5 bg-error-container text-on-error-container rounded-full font-bold uppercase tracking-tighter">Failed</span>
</div>
</div>
</div>
</section>
<!-- Informational Card -->
<section class="bg-primary-container/20 rounded-xl p-6 border-l-4 border-secondary flex gap-4">
<span class="material-symbols-outlined text-secondary" data-icon="info">info</span>
<div>
<p class="font-headline font-bold text-primary text-sm">Reloadly Verification</p>
<p class="text-sm text-on-surface-variant leading-relaxed">Your account is active. Transaction limits are currently set to $5,000 per day. <a class="text-secondary font-bold" href="/dashboard/billing">Increase Limit</a></p>
</div>
</section>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_-10px_40px_rgba(25,28,29,0.04)] rounded-t-3xl">
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-5 py-2 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors" href="/dashboard/conversations">
<span class="material-symbols-outlined mb-1" data-icon="forum">forum</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Chats</span>
</a>
<a class="flex flex-col items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl px-5 py-2 scale-110 transition-transform duration-300 ease-out" href="/dashboard/billing">
<span class="material-symbols-outlined mb-1" data-icon="account_balance_wallet" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Wallet</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-5 py-2 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors" href="/dashboard/billing">
<span class="material-symbols-outlined mb-1" data-icon="add_card">add_card</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Top-up</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-5 py-2 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors" href="/dashboard/broadcasts">
<span class="material-symbols-outlined mb-1" data-icon="receipt_long">receipt_long</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">History</span>
</a>
</nav>` }}
      />
    </DashboardShell>
  );
}