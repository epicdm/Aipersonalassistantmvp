"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IntegrationsPage() {
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
        dangerouslySetInnerHTML={{ __html: `<!-- Top Navigation Shell -->
<header class="bg-[#f8f9fa] dark:bg-[#191c1d] flex justify-between items-center w-full px-6 py-4 sticky top-0 z-40 transition-colors">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Professional male user profile portrait with neutral background, soft studio lighting, high quality photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZBhN5p6zKtgUzebviAmCyTNX3Hrkgl-SjTyMKH4v1yoQp6-pPat1EdnL3P3_V4V5ui8-oYPzR41XE8nm0Qz4zQ3s5EVuYJu260osoEmxLEl7IaRutXliMvexx8fYib2CEChFEfjhEae1JIU87NhTS6DpCkmQ28USoYC1qxXNF2UUhvCfQezLYkiJNwp2ZRFXivnXhbL3bhgKOIjFJyLbY-Ko5FytAEeOzLidBTjIpmZe6x-unmyD2rnvY3UfZaHvgRNcQQT1g2bs"/>
</div>
<span class="text-[#004B57] dark:text-[#5dfd8a] font-black tracking-tighter text-xl font-headline">Nexus AI</span>
</div>
<nav class="hidden md:flex items-center gap-8">
<a class="text-[#004B57] dark:text-[#5dfd8a] font-semibold text-sm transition-colors" href="#">Home</a>
<a class="text-[#404849] dark:text-[#bfc8ca] font-semibold text-sm hover:text-[#004B57] dark:hover:text-[#5dfd8a] transition-colors" href="#">Channels</a>
<a class="text-[#404849] dark:text-[#bfc8ca] font-semibold text-sm hover:text-[#004B57] dark:hover:text-[#5dfd8a] transition-colors" href="#">Analytics</a>
<a class="text-[#404849] dark:text-[#bfc8ca] font-semibold text-sm hover:text-[#004B57] dark:hover:text-[#5dfd8a] transition-colors" href="#">Management</a>
</nav>
<div class="flex items-center gap-4">
<button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e7e8e9] dark:hover:bg-[#3f484a] transition-colors active:scale-95">
<span class="material-symbols-outlined text-[#004B57] dark:text-[#5dfd8a]">notifications</span>
</button>
</div>
</header>
<main class="max-w-7xl mx-auto px-6 pt-12 pb-32">
<!-- Hero & Search -->
<section class="mb-12">
<div class="max-w-3xl">
<h1 class="font-headline font-extrabold text-4xl md:text-5xl text-primary tracking-tight mb-4">Toolbox Store</h1>
<p class="text-on-surface-variant text-lg leading-relaxed mb-8">Extend your AI agent's capabilities with professional-grade plugins and seamless integrations.</p>
<div class="relative group">
<div class="absolute inset-y-0 left-5 flex items-center pointer-events-none">
<span class="material-symbols-outlined text-outline">search</span>
</div>
<input class="w-full h-16 pl-14 pr-6 bg-surface-container-highest rounded-xl border-none focus:ring-2 focus:ring-secondary/40 text-on-surface placeholder:text-outline transition-all text-lg font-medium" placeholder="Search for integrations or workflows..." type="text"/>
</div>
</div>
</section>
<!-- Categories -->
<section class="mb-10 overflow-x-auto no-scrollbar">
<div class="flex items-center gap-3 pb-2">
<button class="px-6 py-2.5 bg-primary text-on-primary rounded-full font-semibold text-sm whitespace-nowrap">All Tools</button>
<button class="px-6 py-2.5 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-full font-semibold text-sm whitespace-nowrap transition-colors">E-commerce</button>
<button class="px-6 py-2.5 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-full font-semibold text-sm whitespace-nowrap transition-colors">Payments</button>
<button class="px-6 py-2.5 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-full font-semibold text-sm whitespace-nowrap transition-colors">Voice</button>
<button class="px-6 py-2.5 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-full font-semibold text-sm whitespace-nowrap transition-colors">CRM</button>
<button class="px-6 py-2.5 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-full font-semibold text-sm whitespace-nowrap transition-colors">Marketing</button>
</div>
</section>
<!-- Plugin Grid -->
<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
<!-- Shopify Sync -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-[#95bf47]/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-[#4a6b10] text-3xl">shopping_cart</span>
</div>
<span class="px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
<span class="w-1.5 h-1.5 rounded-full bg-secondary pulse-subtle"></span>
                            Active
                        </span>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">Shopify Sync</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Enable AI to sell products directly in chat and sync inventory in real-time.</p>
</div>
<div class="flex items-center gap-3">
<button class="flex-1 py-3 px-4 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">Manage</button>
<button class="p-3 bg-surface-container-high text-primary rounded-lg hover:bg-surface-container-highest transition-colors">
<span class="material-symbols-outlined text-xl">settings</span>
</button>
</div>
</div>
<!-- Stripe Payments -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-[#635bff]/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-[#635bff] text-3xl">payments</span>
</div>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">Stripe Payments</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Process secure payments and subscriptions directly through the AI interface.</p>
</div>
<button class="w-full py-3 px-4 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm hover:brightness-95 transition-all">Configure</button>
</div>
<!-- Reloadly Top-ups -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-primary-container/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-primary-container text-3xl">phone_iphone</span>
</div>
<span class="px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
<span class="w-1.5 h-1.5 rounded-full bg-secondary pulse-subtle"></span>
                            Active
                        </span>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">Reloadly Top-ups</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Send mobile airtime and data bundles to customers worldwide via AI commands.</p>
</div>
<div class="flex items-center gap-3">
<button class="flex-1 py-3 px-4 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">Manage</button>
<button class="p-3 bg-surface-container-high text-primary rounded-lg hover:bg-surface-container-highest transition-colors">
<span class="material-symbols-outlined text-xl">settings</span>
</button>
</div>
</div>
<!-- Google Calendar Booking -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-[#4285f4]/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-[#4285f4] text-3xl">calendar_month</span>
</div>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">Google Calendar</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Allow users to book meetings and check availability with natural language.</p>
</div>
<button class="w-full py-3 px-4 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm hover:brightness-95 transition-all">Configure</button>
</div>
<!-- WhatsApp Business -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-secondary text-3xl">forum</span>
</div>
<span class="px-3 py-1 bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
<span class="w-1.5 h-1.5 rounded-full bg-secondary pulse-subtle"></span>
                            Active
                        </span>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">WhatsApp Hub</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Centralize all WhatsApp communications through your AI concierge agent.</p>
</div>
<div class="flex items-center gap-3">
<button class="flex-1 py-3 px-4 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">Manage</button>
<button class="p-3 bg-surface-container-high text-primary rounded-lg hover:bg-surface-container-highest transition-colors">
<span class="material-symbols-outlined text-xl">settings</span>
</button>
</div>
</div>
<!-- Mailchimp -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-[#ffe01b]/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-[#7b6d0e] text-3xl">mail</span>
</div>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">Mailchimp</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Automate subscriber list updates and campaign reporting via AI.</p>
</div>
<button class="w-full py-3 px-4 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm hover:brightness-95 transition-all">Configure</button>
</div>
<!-- Zendesk -->
<div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between group hover:shadow-[0_20px_40px_rgba(25,28,29,0.06)] transition-all">
<div>
<div class="flex justify-between items-start mb-6">
<div class="w-14 h-14 bg-[#03363d]/10 rounded-2xl flex items-center justify-center">
<span class="material-symbols-outlined text-[#03363d] text-3xl">support_agent</span>
</div>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-2">Zendesk CRM</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-6">Connect support tickets to AI workflows for faster customer resolution.</p>
</div>
<button class="w-full py-3 px-4 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm hover:brightness-95 transition-all">Configure</button>
</div>
<!-- Custom API Hook -->
<div class="bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 rounded-xl p-6 flex flex-col justify-center items-center text-center group hover:bg-surface-container transition-all">
<div class="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-outline text-3xl">add</span>
</div>
<h3 class="font-headline font-bold text-xl text-primary mb-1">Custom Tool</h3>
<p class="text-on-surface-variant text-sm">Build your own private plugin via API</p>
<button class="mt-6 text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Create Now <span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
</section>
<!-- Bento Spotlight Section -->
<section class="mt-20">
<h2 class="font-headline font-extrabold text-2xl text-primary mb-8">Featured Integration</h2>
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[400px]">
<div class="md:col-span-2 relative rounded-3xl overflow-hidden group">
<img alt="Analytics Dashboard" class="w-full h-full object-cover" data-alt="Modern high-tech command center interface with glowing data visualizations and neon accents in a dark room" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmbh-_pKFcQqxI9lZBXXTxM9CRlrZ_RmgV6XiWsJHRab0DikdbKrCsoUX2xnEDVzoI-lJ4Z2TA13S8iaN4yQZbonA8iV6Wv4SYxWLquIVs40U1IHvqeqeDRt-jAypXOAvhtUaPtPNx8-ehSkCSTnTso4lg5FJrw8jMvkEgdHhTCx30GjUtyo-KaK9MdwxjRJ81JjFEEI9FRyvpY0e8IZ5UsZypv0CY4DgUfBqth_-Z1kiDIveSHCiPj7zaqELxFQF3R2VvbU93tZM"/>
<div class="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-8">
<span class="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full mb-4 w-fit">New Arrival</span>
<h3 class="font-headline font-extrabold text-3xl text-white mb-2">Advanced Analytics Pro</h3>
<p class="text-white/80 max-w-lg mb-6">Gain deep behavioral insights with AI-driven customer sentiment analysis and automated reporting.</p>
<button class="bg-white text-primary font-bold py-3 px-6 rounded-xl w-fit hover:scale-105 transition-transform active:scale-95">Explore Features</button>
</div>
</div>
<div class="bg-[#004B57] rounded-3xl p-8 flex flex-col justify-center text-center text-white">
<div class="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-6">
<span class="material-symbols-outlined text-4xl text-secondary-fixed">auto_awesome</span>
</div>
<h3 class="font-headline font-bold text-2xl mb-4">AI Pulse Engine</h3>
<p class="text-white/70 text-sm leading-relaxed mb-8">Our latest engine upgrade improves integration response times by 40%.</p>
<div class="flex items-center justify-center gap-2 text-secondary-fixed font-bold">
<span class="w-2 h-2 rounded-full bg-secondary-fixed pulse-subtle"></span>
                        Live Status: Optimal
                    </div>
</div>
</div>
</section>
</main>
<!-- Bottom Navigation Shell -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-[#191c1d]/80 backdrop-blur-xl border-t border-[#bfc8ca]/15 shadow-[0_-10px_40px_rgba(25,28,29,0.04)] md:hidden">
<a class="flex flex-col items-center justify-center text-[#404849] dark:text-[#bfc8ca] px-5 py-2 hover:text-[#004B57] dark:hover:text-[#5dfd8a]" href="#">
<span class="material-symbols-outlined mb-1">home</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-[#404849] dark:text-[#bfc8ca] px-5 py-2 hover:text-[#004B57] dark:hover:text-[#5dfd8a]" href="#">
<span class="material-symbols-outlined mb-1">chat_bubble</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Channels</span>
</a>
<a class="flex flex-col items-center justify-center text-[#404849] dark:text-[#bfc8ca] px-5 py-2 hover:text-[#004B57] dark:hover:text-[#5dfd8a]" href="#">
<span class="material-symbols-outlined mb-1">insights</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Analytics</span>
</a>
<a class="flex flex-col items-center justify-center bg-[#004B57] dark:bg-[#5dfd8a] text-white dark:text-[#00391a] rounded-2xl px-5 py-2 pulse-subtle scale-110" href="#">
<span class="material-symbols-outlined mb-1">settings_suggest</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Manage</span>
</a>
</nav>
<!-- Floating Action Button - Only on relevant management context -->
<button class="fixed right-6 bottom-24 md:bottom-10 z-50 w-16 h-16 bg-gradient-to-br from-[#00333c] to-[#004b57] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
<span class="material-symbols-outlined text-3xl">add</span>
</button>` }}
      />
    </DashboardShell>
  );
}