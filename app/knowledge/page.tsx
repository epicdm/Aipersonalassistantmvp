"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function KnowledgePage() {
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
<header class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 dark:bg-[#00333c]/80 backdrop-blur-md shadow-sm dark:shadow-none">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-primary overflow-hidden">
<img alt="User" class="w-full h-full object-cover" data-alt="professional headshot of a business owner in a modern office with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYOM38ghvBCYkb3Eu1lOv7eaSK1oFGJaizO8Aeop36aPEzJS-T849nBIPy-zcteiRl6GGiXPI_pPWywlvgQY8IZYG7yJrqMcFj0lk-expd2raQhOc-qBZMap8TtOckGAWqb11M5p62JehZu9mqmtEs2fgliNlwu1dlPElQFN30DGrsCay-62IK_gy3c9BDkTQpQpg37zlpoNUqh6evJNYVKpFP7vPOhyXffMVwREKIqEv7K59qtiF2XebEtXmBH0evhaObdycLWEk"/>
</div>
<h1 class="font-manrope font-bold text-xl tracking-tight text-[#004b57] dark:text-[#5dfd8a]">Knowledge</h1>
</div>
<button class="material-symbols-outlined text-[#004b57] dark:text-[#5dfd8a] hover:bg-[#f2f4f4] dark:hover:bg-[#004b57]/50 transition-colors p-2 rounded-full active:scale-95 duration-200" data-icon="settings">settings</button>
<div class="absolute bottom-0 left-0 bg-[#f2f4f4] dark:bg-[#191c1d] h-[1px] w-full"></div>
</header>
<main class="pt-24 px-6 max-w-md mx-auto">
<!-- AI Intelligence Stats Bento Section -->
<section class="mb-8">
<div class="grid grid-cols-2 gap-4">
<div class="col-span-2 bg-primary rounded-xl p-6 text-on-primary shadow-lg overflow-hidden relative">
<div class="relative z-10">
<p class="text-on-primary-container text-xs font-semibold uppercase tracking-widest mb-1">Knowledge Coverage</p>
<h2 class="font-headline text-3xl font-extrabold mb-4">84% Ready</h2>
<div class="w-full bg-primary-container rounded-full h-2">
<div class="bg-secondary-container h-2 rounded-full w-[84%]"></div>
</div>
</div>
<div class="absolute -right-4 -bottom-4 opacity-10">
<span class="material-symbols-outlined text-9xl" style="font-variation-settings: 'FILL' 1;">auto_stories</span>
</div>
</div>
</div>
</section>
<!-- Search & Filter -->
<section class="mb-8">
<div class="relative group">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input class="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-secondary/40 transition-all" placeholder="Filter sources..." type="text"/>
</div>
</section>
<!-- Add Source Actions -->
<section class="mb-10">
<h3 class="font-headline text-lg font-bold mb-4 px-1">Expand Intelligence</h3>
<div class="flex flex-col gap-3">
<button class="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-secondary-fixed">
<span class="material-symbols-outlined" data-icon="upload_file">upload_file</span>
</div>
<div class="text-left">
<p class="font-bold text-sm">Upload Documents</p>
<p class="text-xs text-on-surface-variant">PDF, DOCX, or CSV files</p>
</div>
</div>
<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
</button>
<button class="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-secondary-fixed">
<span class="material-symbols-outlined" data-icon="language">language</span>
</div>
<div class="text-left">
<p class="font-bold text-sm">Connect Website</p>
<p class="text-xs text-on-surface-variant">Sync from your live URL</p>
</div>
</div>
<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
</button>
<button class="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
<div class="flex items-center gap-4">
<div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-secondary-fixed">
<span class="material-symbols-outlined" data-icon="edit_note">edit_note</span>
</div>
<div class="text-left">
<p class="font-bold text-sm">Manual Entry</p>
<p class="text-xs text-on-surface-variant">Write or paste text data</p>
</div>
</div>
<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
</button>
</div>
</section>
<!-- Knowledge Sources List -->
<section>
<div class="flex items-center justify-between mb-4 px-1">
<h3 class="font-headline text-lg font-bold">Active Sources</h3>
<span class="text-xs font-bold text-secondary uppercase tracking-widest">3 Items</span>
</div>
<div class="space-y-4">
<!-- Source Item 1: Ready -->
<div class="bg-white rounded-xl p-4 flex flex-col gap-4 shadow-sm">
<div class="flex items-start justify-between">
<div class="flex gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center overflow-hidden">
<img alt="Website" class="w-6 h-6" data-alt="minimalist tech company logo with clean geometric lines on a soft grey background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAju57EkOJUuPrf7Ld57-3iOeRIbecWepl3by69ca1dhTUkHzckAop2_wbD1erR15DilCHhKSByLlKR9kcOwV7PfNuVeB8W1PdwXGaBpbGYQDefX7r6glHGDwTySijrK2e_IdpT2en1_0vOVsdrAcoZjmrI8QCQlHwIRq73engGAFTF8GqxjMGGhFNFFEOTG21DegZFkmKNJwTH7NCjGfMA0rct50PhwVq8jPt5RWFakORHbSr1gZjlNUgyuDL6XPtQ_gEaniCPT8Y"/>
</div>
<div>
<h4 class="font-bold text-sm">Customer-FAQ-V2.pdf</h4>
<p class="text-xs text-on-surface-variant">Added 2 days ago • 420 KB</p>
</div>
</div>
<span class="px-3 py-1 bg-secondary-container/20 text-on-secondary-container text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
<span class="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                            Ready
                        </span>
</div>
</div>
<!-- Source Item 2: Indexing -->
<div class="bg-white rounded-xl p-4 flex flex-col gap-4 shadow-sm">
<div class="flex items-start justify-between">
<div class="flex gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
<span class="material-symbols-outlined text-primary">public</span>
</div>
<div>
<h4 class="font-bold text-sm">https://nexus-cyan.app/docs</h4>
<p class="text-xs text-on-surface-variant">Scanning 12 sub-pages...</p>
</div>
</div>
<span class="px-3 py-1 bg-primary-container/10 text-primary text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1 ai-pulse">
<span class="w-1.5 h-1.5 bg-primary rounded-full"></span>
                            Indexing
                        </span>
</div>
</div>
<!-- Source Item 3: Syncing -->
<div class="bg-white rounded-xl p-4 flex flex-col gap-4 shadow-sm border-l-4 border-secondary-fixed">
<div class="flex items-start justify-between">
<div class="flex gap-4">
<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
<span class="material-symbols-outlined text-primary">description</span>
</div>
<div>
<h4 class="font-bold text-sm">Product Catalog 2024</h4>
<p class="text-xs text-on-surface-variant">Last synced 5m ago</p>
</div>
</div>
<span class="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
<span class="material-symbols-outlined text-[12px]">sync</span>
                            Syncing
                        </span>
</div>
</div>
</div>
</section>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white dark:bg-[#00333c] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-2xl">
<a class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] transition-all" href="#">
<span class="material-symbols-outlined" data-icon="home">home</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider mt-1">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] transition-all" href="#">
<span class="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider mt-1">Agents</span>
</a>
<a class="flex flex-col items-center justify-center text-[#007232] dark:text-[#5dfd8a] bg-[#5dfd8a]/10 dark:bg-[#5dfd8a]/20 rounded-xl px-4 py-1.5 animate-pulse-subtle" href="#">
<span class="material-symbols-outlined" data-icon="auto_stories" style="font-variation-settings: 'FILL' 1;">auto_stories</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider mt-1">Knowledge</span>
</a>
<a class="flex flex-col items-center justify-center text-[#191c1d]/50 dark:text-[#bfc8ca] px-4 py-1.5 hover:text-[#004b57] transition-all" href="#">
<span class="material-symbols-outlined" data-icon="chat">chat</span>
<span class="font-inter text-[10px] font-semibold uppercase tracking-wider mt-1">Chats</span>
</a>
</nav>
<!-- Floating Action Button for Knowledge -->
<button class="fixed right-6 bottom-28 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform z-40">
<span class="material-symbols-outlined text-3xl">add</span>
</button>` }}
      />
    </DashboardShell>
  );
}