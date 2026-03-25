"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CallsPage() {
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
        dangerouslySetInnerHTML={{ __html: `<!-- Sidebar Navigation (Desktop) -->
<aside class="hidden md:flex flex-col p-6 space-y-2 h-full w-64 fixed left-0 top-0 bg-slate-100 dark:bg-slate-950 z-40">
<div class="text-lg font-bold text-cyan-900 dark:text-cyan-50 mb-8 font-headline tracking-tight">AI Management</div>
<nav class="flex flex-col space-y-1">
<a class="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all duration-200 rounded-lg group" href="#">
<span class="material-symbols-outlined" data-icon="dashboard">dashboard</span>
<span class="font-inter text-sm font-medium">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 bg-white text-cyan-700 rounded-lg shadow-sm font-semibold translate-x-1 transition-all duration-200" href="#">
<span class="material-symbols-outlined" data-icon="settings_phone">settings_phone</span>
<span class="font-inter text-sm font-medium">Voice Config</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all duration-200 rounded-lg group" href="#">
<span class="material-symbols-outlined" data-icon="account_tree">account_tree</span>
<span class="font-inter text-sm font-medium">Automations</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all duration-200 rounded-lg group" href="#">
<span class="material-symbols-outlined" data-icon="sensors">sensors</span>
<span class="font-inter text-sm font-medium">Real-time Monitor</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all duration-200 rounded-lg group" href="#">
<span class="material-symbols-outlined" data-icon="leaderboard">leaderboard</span>
<span class="font-inter text-sm font-medium">Analytics</span>
</a>
</nav>
</aside>
<!-- Top AppBar -->
<header class="flex justify-between items-center px-8 h-20 w-full fixed top-0 z-50 bg-slate-50/80 backdrop-blur-xl md:pl-72">
<div class="text-2xl font-black text-cyan-900 font-headline tracking-tight">The Digital Concierge</div>
<div class="flex items-center gap-4">
<div class="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-full">
<span class="w-2 h-2 rounded-full bg-secondary-fixed pulse-ai"></span>
<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">AI Live</span>
</div>
<button class="p-2 hover:bg-slate-100 transition-colors rounded-full">
<span class="material-symbols-outlined text-cyan-900" data-icon="settings">settings</span>
</button>
<div class="w-10 h-10 rounded-full bg-primary-container overflow-hidden">
<img class="w-full h-full object-cover" data-alt="professional portrait of a business executive in a modern office setting with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDikA3suB5lgfyo6QLdBBKaEQCBBnW4aqPBBP5D5hoAbN6IbO7x73G9J7teco3rB3I-d8ny0p1yBdFAPCPYzw3fMAZJx1tatbUcJFE3Lq2XNX4rLMK7JsSwlSY2KIbcmb2jkI2Yg-2l_yXouVkzXShW6S2BlLsDsG4TSmIYFu5Eh2z04hTWfnBS0VDZueaMpoAkQQ3PWWLgUw2Qz7WvqkQqUfuqcJ7QPkNxjylZx6YzrZzMWKTzwc60cF4i-6CIWnK0_UaaVmUZbKY"/>
</div>
</div>
</header>
<!-- Main Content Canvas -->
<main class="pt-28 pb-24 px-6 md:pl-72 md:pr-12 max-w-7xl mx-auto">
<!-- Header Section with Asymmetric Layout -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-end">
<div class="lg:col-span-8">
<h1 class="font-headline text-5xl font-extrabold text-primary tracking-tight mb-4">Voice &amp; PBX Configuration</h1>
<p class="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
                    Define how your business handles incoming voice traffic from WhatsApp. Orchestrate between AI efficiency and human expertise.
                </p>
</div>
<div class="lg:col-span-4 flex justify-end">
<button class="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:scale-[0.98] transition-all">
<span>Deploy Changes</span>
<span class="material-symbols-outlined" data-icon="rocket_launch">rocket_launch</span>
</button>
</div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
<!-- Primary Configuration: Bento Grid Style -->
<div class="lg:col-span-2 space-y-8">
<!-- AI Voice Section -->
<section class="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10">
<div class="flex justify-between items-start mb-6">
<div class="flex items-center gap-4">
<div class="p-3 bg-secondary-container rounded-xl">
<span class="material-symbols-outlined text-on-secondary-container text-3xl" data-icon="record_voice_over">record_voice_over</span>
</div>
<div>
<h3 class="font-headline text-xl font-bold text-primary">AI Voice Assistant First</h3>
<p class="text-sm text-on-surface-variant">Intelligent call screening and resolution</p>
</div>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox" value=""/>
<div class="w-14 h-7 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-secondary"></div>
</label>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
<div class="p-5 bg-surface-container-low rounded-xl">
<span class="text-xs font-bold text-on-surface-variant uppercase mb-2 block tracking-widest">Greeting Script</span>
<p class="text-on-surface italic leading-relaxed">"Hello, thanks for calling BFF. How can our digital assistant help you today?"</p>
</div>
<div class="p-5 bg-surface-container-low rounded-xl">
<span class="text-xs font-bold text-on-surface-variant uppercase mb-2 block tracking-widest">Voice Engine</span>
<div class="flex items-center gap-2 mt-1">
<span class="material-symbols-outlined text-secondary" data-icon="neurology">neurology</span>
<span class="font-semibold text-primary">Neural HD - Samantha</span>
</div>
</div>
</div>
</section>
<!-- PBX & Human Fallback -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
<!-- Direct PBX Extension -->
<section class="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10 flex flex-col h-full">
<div class="p-3 bg-primary-container/10 w-fit rounded-xl mb-6 text-primary">
<span class="material-symbols-outlined text-3xl" data-icon="dialpad">dialpad</span>
</div>
<h3 class="font-headline text-xl font-bold text-primary mb-2">Direct PBX Extension</h3>
<p class="text-sm text-on-surface-variant mb-8 flex-grow">Route calls directly to a specific department or SIP phone.</p>
<div class="space-y-4">
<label class="block">
<span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Extension Number</span>
<input class="mt-1 block w-full bg-surface-container-highest border-none rounded-lg p-3 text-primary focus:ring-2 focus:ring-secondary/40 placeholder:text-on-surface-variant/40" placeholder="e.g. 102" type="text"/>
</label>
</div>
</section>
<!-- Human Fallback -->
<section class="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10 flex flex-col h-full">
<div class="p-3 bg-secondary-container/20 w-fit rounded-xl mb-6 text-secondary">
<span class="material-symbols-outlined text-3xl" data-icon="support_agent">support_agent</span>
</div>
<h3 class="font-headline text-xl font-bold text-primary mb-2">Human Fallback</h3>
<p class="text-sm text-on-surface-variant mb-8 flex-grow">Redirect to a human operator if AI resolution is not possible.</p>
<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
<span class="text-sm font-medium">Auto-forwarding</span>
<span class="text-xs px-2 py-1 bg-secondary-fixed text-on-secondary-fixed rounded font-bold uppercase tracking-tighter">Enabled</span>
</div>
</section>
</div>
<!-- Operating Hours -->
<section class="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10">
<div class="flex items-center justify-between mb-8">
<div>
<h3 class="font-headline text-xl font-bold text-primary">Operating Hours</h3>
<p class="text-sm text-on-surface-variant">Calls outside these windows will trigger an automated voicemail.</p>
</div>
<span class="material-symbols-outlined text-on-surface-variant" data-icon="schedule">schedule</span>
</div>
<div class="space-y-4">
<!-- Monday-Friday Row -->
<div class="flex items-center justify-between py-4 border-b border-surface-variant/30">
<div class="flex items-center gap-4">
<div class="w-12 h-12 bg-surface-container-low flex items-center justify-center rounded-full font-bold text-primary">M-F</div>
<span class="font-semibold">Weekdays</span>
</div>
<div class="flex items-center gap-4">
<div class="px-4 py-2 bg-surface-container-low rounded-lg font-mono text-sm">09:00 AM</div>
<span class="text-on-surface-variant">—</span>
<div class="px-4 py-2 bg-surface-container-low rounded-lg font-mono text-sm">06:00 PM</div>
</div>
</div>
<!-- Saturday Row -->
<div class="flex items-center justify-between py-4 border-b border-surface-variant/30">
<div class="flex items-center gap-4">
<div class="w-12 h-12 bg-surface-container-low flex items-center justify-center rounded-full font-bold text-primary">S</div>
<span class="font-semibold">Saturday</span>
</div>
<div class="flex items-center gap-4">
<div class="px-4 py-2 bg-surface-container-low rounded-lg font-mono text-sm">10:00 AM</div>
<span class="text-on-surface-variant">—</span>
<div class="px-4 py-2 bg-surface-container-low rounded-lg font-mono text-sm">02:00 PM</div>
</div>
</div>
<!-- Sunday Row -->
<div class="flex items-center justify-between py-4">
<div class="flex items-center gap-4">
<div class="w-12 h-12 bg-surface-container-low flex items-center justify-center rounded-full font-bold text-primary/40">S</div>
<span class="font-semibold text-on-surface-variant">Sunday</span>
</div>
<span class="text-sm italic text-on-surface-variant">Closed - All calls to Voicemail</span>
</div>
</div>
</section>
</div>
<!-- Side Cards / Status Panel -->
<div class="space-y-8">
<!-- Live Health Card -->
<div class="bg-primary text-on-primary p-8 rounded-lg relative overflow-hidden">
<div class="absolute -right-8 -top-8 w-40 h-40 bg-primary-container rounded-full opacity-20"></div>
<h4 class="font-headline text-lg font-bold mb-6">Service Health</h4>
<div class="space-y-6 relative z-10">
<div class="flex justify-between items-center">
<span class="text-on-primary/70 text-sm">Voice Server</span>
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-secondary-fixed"></span>
<span class="text-xs font-bold">STABLE</span>
</div>
</div>
<div class="flex justify-between items-center">
<span class="text-on-primary/70 text-sm">AI Latency</span>
<span class="text-xs font-bold">120ms</span>
</div>
<div class="flex justify-between items-center">
<span class="text-on-primary/70 text-sm">Concurrent Slots</span>
<span class="text-xs font-bold">24 / 100</span>
</div>
</div>
</div>
<!-- Preview Card -->
<div class="bg-surface-container-high/80 backdrop-blur-md p-8 rounded-lg border border-white/40">
<h4 class="font-headline text-lg font-bold text-primary mb-6">Call Flow Preview</h4>
<div class="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/30">
<div class="relative">
<div class="absolute -left-[20px] top-1 w-3 h-3 rounded-full bg-secondary"></div>
<span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Step 1: Intake</span>
<p class="text-sm font-medium">Caller hits WhatsApp Number</p>
</div>
<div class="relative">
<div class="absolute -left-[20px] top-1 w-3 h-3 rounded-full bg-secondary"></div>
<span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Step 2: AI Agent</span>
<p class="text-sm font-medium">Neural engine greets caller</p>
</div>
<div class="relative">
<div class="absolute -left-[20px] top-1 w-3 h-3 rounded-full bg-outline-variant"></div>
<span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Step 3: Resolve</span>
<p class="text-sm font-medium">Direct to PBX Ext. if requested</p>
</div>
</div>
</div>
<!-- Info Graphic Card -->
<div class="rounded-lg overflow-hidden h-64 relative group">
<img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="modern tech workspace with high-end microphones and communication gear in a sleek minimalist setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6tgo0BGx4eYyJfqUCLe0LFXAr6BlDF5Nm3O_O350CN1yHhp--B6IS375vCpfkMcAswljhl93WB8hMdbFt6KfPiqzYBJ6dfnOjbBXKVHTkKvIURvTmI3l1UyAeSSlemzWfvE21v35a06nd_vYKv1-sO49WJXRn11mcjTh4LVB9DVrrEHBZf-dwzTC3ajiI-YjU8vlCFMOodx3q8_t6DexgCF4U_hLw59Z8uP28ka0WAL08WxGIk2hS-byJ7Phi98cKEDfbx01Inok"/>
<div class="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
<p class="text-on-primary text-sm font-medium leading-relaxed">Configuring advanced SIP trunking protocols with BFF's secure voice gateway.</p>
</div>
</div>
</div>
</div>
</main>
<!-- Bottom Navigation (Mobile Only) -->
<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white/90 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
<a class="flex flex-col items-center justify-center text-slate-400" href="#">
<span class="material-symbols-outlined" data-icon="podcasts">podcasts</span>
<span class="font-inter text-[10px] uppercase tracking-widest font-bold">Monitor</span>
</a>
<a class="flex flex-col items-center justify-center bg-emerald-100 text-emerald-700 rounded-2xl px-6 py-2" href="#">
<span class="material-symbols-outlined" data-icon="call">call</span>
<span class="font-inter text-[10px] uppercase tracking-widest font-bold">Voice</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400" href="#">
<span class="material-symbols-outlined" data-icon="bolt">bolt</span>
<span class="font-inter text-[10px] uppercase tracking-widest font-bold">Workflows</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-400" href="#">
<span class="material-symbols-outlined" data-icon="chat">chat</span>
<span class="font-inter text-[10px] uppercase tracking-widest font-bold">Chat</span>
</a>
</nav>` }}
      />
    </DashboardShell>
  );
}