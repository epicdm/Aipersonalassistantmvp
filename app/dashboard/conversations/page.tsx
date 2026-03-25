"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ConversationsPage() {
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
<header class="bg-[#f8f9fa] dark:bg-slate-950 docked full-width top-0 sticky z-50 bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-900">
<div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-[#004B57] dark:text-cyan-400 text-2xl" data-icon="bubble_chart">bubble_chart</span>
<h1 class="font-manrope font-bold text-2xl tracking-tight text-[#004B57] dark:text-cyan-400">BFF Assistant</h1>
</div>
<div class="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container/20">
<img alt="User Profile Avatar" class="w-full h-full object-cover" data-alt="Close-up portrait of a professional woman with a friendly expression, soft studio lighting, high-end photography style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAk-hRuYKX2_SflYCcdOTbM9Wv6dpsxo3P-7jNqushh6TCk_vS_w_vTf_MPZGBpgugaydN0tDuraCe8X4qoQ_s_d_H7pK75TyCucUxdT4XbJcoSJ-B1h8fA8rdUNzG3quB5IW6oq4HNcOTdFDp4rzBKa7DpeVAZC_s-mNK0UpEFnogsQCUbY8hVWJg67Is4BT_gNjx_vTNGRdBrO0Ca2bvGoItLFOmvyRONVtM04nQ9R9nrbuGXycmLUsf9gDZOyEEi5YgqWRZTBLY"/>
</div>
</div>
</header>
<main class="pb-32 px-4 max-w-md mx-auto">
<!-- Dashboard Summary Bento -->
<section class="grid grid-cols-2 gap-3 mb-8 mt-4">
<div class="bg-surface-container-lowest p-5 rounded-lg flex flex-col justify-between h-32 shadow-sm">
<span class="text-secondary font-bold text-3xl">12</span>
<span class="font-headline font-bold text-sm text-primary tracking-tight">AI Active</span>
</div>
<div class="bg-secondary-container p-5 rounded-lg flex flex-col justify-between h-32 shadow-sm">
<span class="text-on-secondary-container font-bold text-3xl">3</span>
<span class="font-headline font-bold text-sm text-on-secondary-container tracking-tight">Needs Approval</span>
</div>
</section>
<!-- Active Conversations List -->
<div class="mb-4 flex items-center justify-between">
<h2 class="font-headline font-extrabold text-xl tracking-tight text-primary">Live Monitor</h2>
<span class="text-[10px] font-bold uppercase tracking-widest text-outline bg-surface-container-high px-2 py-1 rounded">Real-time Pulse</span>
</div>
<div class="space-y-4 mb-10">
<!-- Chat Card: Needs Approval -->
<div class="bg-surface-container-lowest rounded-lg p-5 flex flex-col gap-4 shadow-[0_4px_12px_rgba(25,28,29,0.04)] ring-1 ring-outline-variant/15 transition-all active:scale-[0.98]">
<div class="flex justify-between items-start">
<div class="flex gap-3">
<div class="relative">
<img alt="Customer" class="w-12 h-12 rounded-full object-cover" data-alt="Headshot of a smiling young man in a denim shirt, warm outdoor natural lighting, blurry greenery background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX8PSc_fxnceiJNfrFPRl5-Njq3JIdfwHqOTOYp6YRXZpdGijgFPNWgj576B-rohdh1Gc5uQg7HVjhOuNZ-eWhlHkTJiAW_uezawAW-ueAZHfQpfbV0wZHsOlbAIM1bNPziUYBfB4L8nlezZisnTxMMUMv05KT7Ge3iM6Id-bNI3JcValVFSWpxp9bjHTtlUh-PQNJyWXQwZdieJ3cjuf1AlW54kCaxcfUe80h-h6Mh_bs1T5BH5_FHYLBA8PHo6uK5ji6dPRdK_c"/>
<div class="absolute -bottom-1 -right-1 bg-secondary w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
<span class="material-symbols-outlined text-[8px] text-white" data-icon="pending">pending</span>
</div>
</div>
<div>
<h3 class="font-bold text-primary">Marcus Jensen</h3>
<p class="text-xs text-outline font-medium">Last seen 2m ago</p>
</div>
</div>
<span class="bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-full">Needs Approval</span>
</div>
<div class="bg-surface-container-low p-3 rounded-xl border-l-4 border-secondary">
<p class="text-xs text-on-surface-variant italic mb-2">AI Drafted:</p>
<p class="text-sm font-medium text-on-surface">"Sure thing, Marcus! I can confirm your appointment for tomorrow at 2 PM. Would you like a calendar invite?"</p>
</div>
<div class="flex gap-2">
<button class="flex-1 bg-secondary text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
<span class="material-symbols-outlined text-sm" data-icon="check_circle">check_circle</span> Approve
                    </button>
<button class="bg-surface-container-high text-primary w-12 py-2.5 rounded-xl flex items-center justify-center">
<span class="material-symbols-outlined" data-icon="edit_note">edit_note</span>
</button>
</div>
</div>
<!-- Chat Card: Human Requested -->
<div class="bg-surface-container-lowest rounded-lg p-5 flex flex-col gap-4 shadow-[0_4px_12px_rgba(25,28,29,0.04)] ring-1 ring-outline-variant/15 transition-all active:scale-[0.98]">
<div class="flex justify-between items-start">
<div class="flex gap-3">
<div class="relative">
<img alt="Customer" class="w-12 h-12 rounded-full object-cover" data-alt="Close up of a woman with vibrant hair color, soft focused urban background, cinematic lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCosYVm2JRlQn0YEalIfA2qauxzBQ2gLsMbFsvalAByyf5bJGgTlAnaOzYhS1uMjwfMT7sXsNMR9Nwxl4gTvDT1IP0rXkFfTi8JbzRA1mxdemGOvGLo9-tiUbwmhjA9iTvFoC8jw9Orr7zP35H3ildFotUOjFO33FNSWP6GtyVEin3TEAk64MYCCc9Mbltah1-KZS4WApwYVvOl59Or0MpXzcoSydFzHCX47pxMvCaAmucKHck-WjOLVbO-yc2t08JAPYlfUcuq42w"/>
<div class="absolute -bottom-1 -right-1 bg-error w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
<span class="material-symbols-outlined text-[8px] text-white" data-icon="person_alert">person_alert</span>
</div>
</div>
<div>
<h3 class="font-bold text-primary">Sarah Chen</h3>
<p class="text-xs text-outline font-medium">Last message: "Speak to human"</p>
</div>
</div>
<span class="bg-error-container text-on-error-container text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-full">Human Requested</span>
</div>
<button class="w-full bg-primary text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
<span class="material-symbols-outlined text-sm" data-icon="forum">forum</span> Take Over Chat
                </button>
</div>
<!-- Chat Card: AI Active -->
<div class="bg-surface-container-low/50 rounded-lg p-5 flex flex-col gap-4 ring-1 ring-outline-variant/10">
<div class="flex justify-between items-start">
<div class="flex gap-3">
<div class="relative">
<div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
<span class="text-white font-bold">AK</span>
</div>
<div class="absolute -bottom-1 -right-1 bg-secondary-fixed w-4 h-4 rounded-full border-2 border-white ai-pulse"></div>
</div>
<div>
<h3 class="font-bold text-primary">Alex Kim</h3>
<p class="text-xs text-outline font-medium">AI responding to inquiry...</p>
</div>
</div>
<span class="text-on-surface-variant text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1">
<span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> AI Active
                    </span>
</div>
</div>
</div>
<!-- Detail View Section (Transcript) -->
<div class="mt-8">
<div class="flex items-center gap-2 mb-6">
<span class="h-px flex-1 bg-outline-variant/30"></span>
<span class="text-[10px] font-bold text-outline uppercase tracking-widest px-3">Transcript Preview: Marcus Jensen</span>
<span class="h-px flex-1 bg-outline-variant/30"></span>
</div>
<div class="space-y-6">
<!-- Message: Customer -->
<div class="flex gap-3 items-start pr-8">
<img alt="Customer" class="w-8 h-8 rounded-full object-cover mt-1" data-alt="Small thumbnail of a man smiling" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJqG6j3-__hFR_Cl1EymHlLhdIPNfL1qiuhlqnSG7Q9RlIKsl2Y1s2jnGmrAsUy-SubUPUkIHKRqnlWUzLi-XGhKQcy-IE1Tzo83f5KPuAo1O_1cCtlSpmWM3ftYzxumy_zfszo2-FJwf-HSIt7Un9Z7fbxXKGc-OBam3D0AsYilOkyEEjXS4lLNMbIZ5IqZ-pn0l7X4-hZn6Z45nyBULBPrc4gLBaL_F9HjpjgXGVmL2wfp0m3Y8Wc6tyH9tZT8ltzGCcp2PrGFU"/>
<div class="bg-surface-container-high p-4 rounded-2xl rounded-tl-none">
<p class="text-sm text-on-surface">Hey! I need to reschedule my session for tomorrow. Is 2 PM available?</p>
<span class="text-[9px] text-outline mt-1 block">14:02</span>
</div>
</div>
<!-- Message: AI Pulse -->
<div class="flex flex-row-reverse gap-3 items-start pl-8">
<div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center mt-1">
<span class="material-symbols-outlined text-white text-sm" data-icon="smart_toy">smart_toy</span>
</div>
<div class="bg-primary p-4 rounded-2xl rounded-tr-none shadow-md">
<div class="flex items-center gap-2 mb-2">
<div class="w-2 h-2 rounded-full bg-secondary-fixed ai-pulse"></div>
<span class="text-[10px] text-on-primary-container font-black uppercase tracking-widest">AI Agent Draft</span>
</div>
<p class="text-sm text-on-primary">Sure thing, Marcus! I can confirm your appointment for tomorrow at 2 PM. Would you like a calendar invite?</p>
<div class="mt-4 flex gap-2">
<button class="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight">Approve AI Draft</button>
<button class="bg-white/10 text-white/80 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight border border-white/20">Discard</button>
</div>
</div>
</div>
<!-- Empty state for user message input -->
<div class="bg-surface-container-highest rounded-full px-5 py-3 mt-8 flex items-center justify-between shadow-inner">
<span class="text-sm text-outline">Type a custom message...</span>
<span class="material-symbols-outlined text-primary-container" data-icon="send">send</span>
</div>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_-10px_40px_rgba(25,28,29,0.04)] rounded-t-2xl border-t border-[#bfc8ca]/15">
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-4 py-1.5 hover:text-[#004B57] transition-colors" href="#">
<span class="material-symbols-outlined mb-1" data-icon="dashboard">dashboard</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Home</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-4 py-1.5 hover:text-[#004B57] transition-colors" href="#">
<span class="material-symbols-outlined mb-1" data-icon="smart_toy">smart_toy</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Agents</span>
</a>
<a class="flex flex-col items-center justify-center bg-[#5dfd8a] dark:bg-green-500/20 text-[#007232] dark:text-green-300 rounded-xl px-4 py-1.5 scale-90 transition-transform duration-150" href="#">
<span class="material-symbols-outlined mb-1" data-icon="forum" style="font-variation-settings: 'FILL' 1;">forum</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Chats</span>
</a>
<a class="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 px-4 py-1.5 hover:text-[#004B57] transition-colors" href="#">
<span class="material-symbols-outlined mb-1" data-icon="person">person</span>
<span class="font-inter text-[11px] font-semibold uppercase tracking-wider">Profile</span>
</a>
</nav>` }}
      />
    </DashboardShell>
  );
}