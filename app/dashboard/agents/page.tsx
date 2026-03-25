"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AgentsPage() {
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
<nav class="bg-[#f8f9fa] dark:bg-slate-950 docked full-width top-0 sticky z-50 bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-900 flat no shadows">
<div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-[#004B57] dark:text-cyan-400 text-3xl">bubble_chart</span>
<span class="text-[#004B57] dark:text-cyan-400 font-extrabold text-2xl tracking-tighter">BFF Assistant</span>
</div>
<div class="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border-2 border-primary/10">
<img alt="User Profile Avatar" class="w-full h-full object-cover" data-alt="Professional headshot of a smiling female executive in a modern office setting with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbAwuNhHB3_jEajdUgKqehPVWoNm2d1Ozn626EoTle2kOhjGvmcx28JvJ0q1EJf_m53BCqreK_W_ZFDF-axSic4czkLaD13OSMDxa8yxTAQ7JIS8rgTsyNMW6RRvvkyd_1SuUK1j6gZzaPt7LQSsvKWiANGo2cj-0KzfW82ocwhmURAxM52TuaRbnUjTqikinWa7N9Se_efjA0f6QIg-XA9qK91yDjl_7dOXZdH-wlFB7NH5TuB7_K1lxUZ2a3Z5XK4OblIvZW-mM"/>
</div>
</div>
</nav>
<main class="pb-24">
<!-- Hero Section -->
<section class="px-6 pt-12 pb-16">
<div class="max-w-md mx-auto">
<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container font-label text-xs font-semibold mb-6 tracking-wide uppercase">
<span class="w-2 h-2 rounded-full bg-secondary ai-pulse"></span>
                    Now available for WhatsApp Business
                </div>
<h1 class="font-headline font-extrabold text-4xl leading-tight tracking-tight text-primary mb-4">
                    Your Business, Powered by <span class="text-secondary">AI WhatsApp</span> Assistants.
                </h1>
<p class="font-body text-lg text-on-surface-variant mb-10 leading-relaxed">
                    Automatically handle all customer conversations. Go live in minutes and transform your mobile communication.
                </p>
<div class="flex flex-col gap-4">
<button class="bg-primary-gradient text-on-primary font-headline font-bold py-4 px-8 rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2">
                        Get Started
                        <span class="material-symbols-outlined">arrow_forward</span>
</button>
<button class="bg-surface-container-high text-primary font-headline font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors active:scale-95">
<span class="material-symbols-outlined">play_circle</span>
                        Watch Demo
                    </button>
</div>
</div>
</section>
<!-- Social Proof / Logos -->
<section class="px-6 py-8 bg-surface-container-low">
<p class="text-center font-label text-[10px] uppercase tracking-widest text-outline mb-6">Built for industry leaders</p>
<div class="flex justify-around items-center opacity-40 grayscale gap-4 px-4">
<div class="flex items-center gap-1 font-bold text-xl"><span class="material-symbols-outlined">hub</span> Meta</div>
<div class="flex items-center gap-1 font-bold text-xl"><span class="material-symbols-outlined">chat_bubble</span> WhatsApp</div>
<div class="flex items-center gap-1 font-bold text-xl"><span class="material-symbols-outlined">token</span> Stripe</div>
</div>
</section>
<!-- Feature Bento Grid -->
<section class="px-6 py-16">
<h2 class="font-headline font-bold text-2xl text-primary mb-8 text-center">Engineered for Reliability</h2>
<div class="grid grid-cols-1 gap-4">
<!-- AI Agent Highlight (Large Card) -->
<div class="bg-surface-container-lowest rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,29,0.04)] relative overflow-hidden">
<div class="flex items-center gap-4 mb-12">
<div class="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
<span class="material-symbols-outlined text-on-secondary-container" style="font-variation-settings: 'FILL' 1;">smart_toy</span>
</div>
<div>
<h3 class="font-headline font-bold text-lg text-primary">Autonomous Agent</h3>
<p class="font-body text-sm text-on-surface-variant">Intelligent decision making</p>
</div>
</div>
<div class="space-y-3 relative z-10">
<div class="glass-panel rounded-xl p-3 max-w-[85%] border-l-4 border-secondary shadow-sm">
<p class="text-xs font-medium text-primary mb-1">Customer:</p>
<p class="text-sm">Do you have table for 4 tonight?</p>
</div>
<div class="bg-primary-container text-on-primary-container rounded-xl p-3 max-w-[85%] ml-auto shadow-sm">
<p class="text-xs font-medium opacity-70 mb-1">BFF Assistant:</p>
<p class="text-sm">Yes! We have an opening at 8 PM. Shall I book it?</p>
</div>
</div>
<!-- Decorative Background Element -->
<div class="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl"></div>
</div>
<!-- Secondary Grid Items -->
<div class="grid grid-cols-2 gap-4">
<div class="bg-surface-container-low rounded-xl p-5 flex flex-col justify-between aspect-square">
<span class="material-symbols-outlined text-primary text-3xl mb-4">bolt</span>
<div>
<h4 class="font-headline font-bold text-sm text-primary mb-1">Instant Setup</h4>
<p class="text-[11px] text-on-surface-variant leading-tight">Live in under 5 minutes with zero code required.</p>
</div>
</div>
<div class="bg-surface-container-low rounded-xl p-5 flex flex-col justify-between aspect-square">
<span class="material-symbols-outlined text-secondary text-3xl mb-4" style="font-variation-settings: 'FILL' 1;">history_toggle_off</span>
<div>
<h4 class="font-headline font-bold text-sm text-primary mb-1">24/7 Presence</h4>
<p class="text-[11px] text-on-surface-variant leading-tight">Never miss a lead while you sleep. Constant engagement.</p>
</div>
</div>
</div>
</div>
</section>
<!-- Product Image Section -->
<section class="px-6 py-8">
<div class="rounded-2xl overflow-hidden bg-primary relative h-80 shadow-2xl">
<img alt="BFF Platform Dashboard" class="w-full h-full object-cover opacity-60" data-alt="Modern smartphone displaying a clean WhatsApp conversation interface with a sophisticated AI business assistant dashboard in the background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4QDMTqPMIVCbGudxEqiU2M42muxjdV8kBK9ncoGtPHRKKmED3qTX7cmMwNMUmIZr2mvLQuI341-IBbxXEhxTj0Cn0eWGBrVZ_1Wn_fetJZTVFfOw3i18tt_oQV-wCCSwzue3dox-Drjwpa79SvEm9yNOu5xi3ilSqsFqPQq7E8qP-TRcB1WZxRBUnkWvOoIWLfWFOhof5YdZsz0bJ6ssnp4JjJf08GXIDyWq3iSnRNGTauh0Jg6iA_IesiE8-n8CJUoHBLgNfMN0"/>
<div class="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent flex items-end p-8">
<div>
<h3 class="text-white font-headline font-bold text-xl mb-2">Total Control</h3>
<p class="text-on-primary-container text-sm">Monitor your AI's performance in real-time through our intuitive mobile dashboard.</p>
</div>
</div>
</div>
</section>
<!-- CTA Section -->
<section class="px-6 py-20 text-center">
<h2 class="font-headline font-extrabold text-3xl text-primary mb-4">Ready to scale?</h2>
<p class="text-on-surface-variant mb-8 max-w-xs mx-auto">Join 2,000+ businesses automating their growth today.</p>
<button class="w-full bg-secondary-container text-on-secondary-container font-headline font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                Start Free Trial
                <span class="material-symbols-outlined">trending_up</span>
</button>
<p class="mt-4 text-[10px] text-outline uppercase font-semibold tracking-widest">No credit card required</p>
</section>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_-10px_40px_rgba(25,28,29,0.04)] rounded-t-2xl border-t border-[#bfc8ca]/15">
<a class="flex flex-col items-center justify-center bg-[#5dfd8a] dark:bg-green-500/20 text-[#007232] dark:text-green-300 rounded-xl px-4 py-1.5 transition-transform duration-150 active:scale-90" href="/dashboard">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">dashboard</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-4 py-1.5 hover:text-[#004B57] dark:hover:text-cyan-300 transition-transform duration-150 active:scale-90" href="/dashboard/agents">
<span class="material-symbols-outlined">smart_toy</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Agents</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-4 py-1.5 hover:text-[#004B57] dark:hover:text-cyan-300 transition-transform duration-150 active:scale-90" href="/dashboard/conversations">
<span class="material-symbols-outlined">forum</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Chats</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-4 py-1.5 hover:text-[#004B57] dark:hover:text-cyan-300 transition-transform duration-150 active:scale-90" href="/dashboard/settings">
<span class="material-symbols-outlined">person</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider mt-1">Profile</span>
</a>
</nav>` }}
      />
    </DashboardShell>
  );
}