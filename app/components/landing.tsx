"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2, Zap, Shield, MessageSquare, Phone } from "lucide-react";
import { TEMPLATES } from "@/app/lib/templates";

interface LandingProps {
  onStart: () => void;
}

const PERSONAL_TEMPLATES = [
  { slug: "assistant", name: "Personal Assistant", emoji: "📅", desc: "Tasks, reminders & life org" },
  { slug: "study-buddy", name: "Study Buddy", emoji: "📚", desc: "Homework help & exam prep" },
  { slug: "life_coach", name: "Life Coach", emoji: "🎯", desc: "Goals & motivation" },
  { slug: "fitness_coach", name: "Fitness Coach", emoji: "💪", desc: "Workouts & nutrition" },
  { slug: "language_tutor", name: "Language Tutor", emoji: "🌍", desc: "Learn any language" },
  { slug: "wellness_buddy", name: "Wellness Buddy", emoji: "🧘", desc: "Mindfulness & support" },
];

const BUSINESS_TEMPLATES = TEMPLATES.filter(t =>
  ["receptionist", "concierge", "collector", "sales", "support"].includes(t.slug)
);

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Try it out. No card needed.",
    features: ["1 AI agent", "100 messages/mo", "WhatsApp connect", "Basic templates"],
    cta: "Start free",
    primary: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    desc: "For growing businesses.",
    features: ["3 AI agents", "5,000 messages/mo", "All templates", "Voice calls", "Priority support"],
    cta: "Get started",
    primary: true,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    desc: "For teams that move fast.",
    features: ["Unlimited agents", "Unlimited messages", "Custom knowledge base", "API access", "Dedicated support"],
    cta: "Go pro",
    primary: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function Landing({ onStart }: LandingProps) {
  const [templateTab, setTemplateTab] = useState<"business" | "personal">("business");

  const handleTemplateClick = (slug: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bff_template", slug);
    }
    onStart();
  };

  const visibleTemplates = templateTab === "business" ? BUSINESS_TEMPLATES : PERSONAL_TEMPLATES;

  return (
    <div className="min-h-screen text-[#FAFAFA] relative overflow-hidden" style={{ backgroundColor: '#050505', fontFamily: 'Figtree, system-ui, sans-serif' }}>
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.035,
          mixBlendMode: 'overlay',
          zIndex: 0,
        }}
      />

      {/* Warm ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(226,114,91,0.06) 0%, transparent 70%)', zIndex: 0 }} />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(212,163,115,0.04) 0%, transparent 70%)', zIndex: 0 }} />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
            BFF
          </span>
          <span className="text-[#A1A1AA] text-xs ml-1 hidden sm:block" style={{ fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            AI Assistant
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#A1A1AA]">
          <a href="#templates" className="hover:text-[#FAFAFA] transition-colors">Templates</a>
          <a href="#pricing" className="hover:text-[#FAFAFA] transition-colors">Pricing</a>
        </div>
        <button
          onClick={onStart}
          className="px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
          style={{ backgroundColor: '#E2725B', color: '#FAFAFA' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F48B76')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E2725B')}
        >
          Sign In
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 px-6 pt-24 pb-20 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <div className="inline-block mb-8">
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#E2725B', border: '1px solid rgba(226,114,91,0.3)', borderRadius: '100px', padding: '6px 16px' }}>
              WhatsApp AI for business
            </span>
          </div>

          <h1 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 'clamp(3.5rem, 10vw, 7rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: '0.95', marginBottom: '1.5rem', color: '#FAFAFA' }}>
            Your business,<br />
            <span style={{ color: '#E2725B' }}>always on.</span>
          </h1>

          <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: '#A1A1AA' }}>
            An AI agent on WhatsApp that handles your customers 24/7 — answers questions, books appointments, follows up on leads. Set up in under 5 minutes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer"
            style={{ backgroundColor: '#E2725B', color: '#FAFAFA' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F48B76'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#E2725B'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#FAFAFA', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            See a demo
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-6 mt-10 text-sm flex-wrap"
          style={{ color: '#A1A1AA' }}
        >
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" style={{ color: '#8B9A6B' }} /> No credit card required</span>
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" style={{ color: '#D4A373' }} /> Live in 5 minutes</span>
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" style={{ color: '#6B8A9A' }} /> You stay in control</span>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#FAFAFA', marginBottom: '0.75rem' }}>
              How it works
            </h2>
            <p style={{ color: '#A1A1AA' }}>From signup to live in under 5 minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: <MessageSquare className="w-5 h-5" />, title: "Pick a template", desc: "Choose from business or personal AI templates. Each one is pre-trained and ready to go." },
              { n: "02", icon: <Phone className="w-5 h-5" />, title: "Connect WhatsApp", desc: "Migrate your number, use your existing API, or get a fresh number from BFF." },
              { n: "03", icon: <Zap className="w-5 h-5" />, title: "Go live", desc: "Your AI starts handling messages instantly. It knows your business and gets smarter every day." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-6 rounded-2xl"
                style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#E2725B' }}>{item.n}</span>
                  <div style={{ color: '#E2725B' }}>{item.icon}</div>
                </div>
                <h3 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.3rem', fontWeight: 500, color: '#FAFAFA', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#A1A1AA', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates ── */}
      <section id="templates" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#FAFAFA', marginBottom: '0.75rem' }}>
              Pick your AI
            </h2>
            <p style={{ color: '#A1A1AA', marginBottom: '2rem' }}>Templates built for how you actually work.</p>

            {/* Tabs */}
            <div className="inline-flex rounded-full p-1" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}>
              {(["business", "personal"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTemplateTab(tab)}
                  className="px-6 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer capitalize"
                  style={{
                    backgroundColor: templateTab === tab ? '#E2725B' : 'transparent',
                    color: templateTab === tab ? '#FAFAFA' : '#A1A1AA',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={templateTab}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {visibleTemplates.map((t) => (
                <motion.button
                  key={t.slug}
                  variants={itemVariants}
                  onClick={() => handleTemplateClick(t.slug)}
                  className="text-left p-5 rounded-2xl cursor-pointer transition-all"
                  style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
                  whileHover={{ y: -4, borderColor: 'rgba(226,114,91,0.3)' }}
                >
                  <div className="text-3xl mb-3">{t.emoji}</div>
                  <h3 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.1rem', fontWeight: 500, color: '#FAFAFA', marginBottom: '0.25rem' }}>
                    {t.name}
                  </h3>
                  <p style={{ color: '#A1A1AA', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {"desc" in t ? (t as any).desc : (t as any).tagline}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#FAFAFA', marginBottom: '0.75rem' }}>
              Simple pricing
            </h2>
            <p style={{ color: '#A1A1AA' }}>Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl flex flex-col"
                style={{
                  backgroundColor: plan.primary ? 'rgba(226,114,91,0.08)' : '#111111',
                  border: plan.primary ? '1px solid rgba(226,114,91,0.3)' : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {plan.primary && (
                  <div className="mb-4">
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#E2725B', border: '1px solid rgba(226,114,91,0.3)', borderRadius: '100px', padding: '3px 10px' }}>
                      Most popular
                    </span>
                  </div>
                )}
                <h3 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.4rem', fontWeight: 500, color: '#FAFAFA', marginBottom: '0.5rem' }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.5rem', fontWeight: 600, color: '#FAFAFA' }}>{plan.price}</span>
                  <span style={{ color: '#A1A1AA', fontSize: '0.85rem' }}>{plan.period}</span>
                </div>
                <p style={{ color: '#A1A1AA', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{plan.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#A1A1AA' }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#E2725B' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onStart}
                  className="w-full py-3 rounded-full font-semibold text-sm transition-all cursor-pointer"
                  style={{
                    backgroundColor: plan.primary ? '#E2725B' : 'transparent',
                    color: plan.primary ? '#FAFAFA' : '#E2725B',
                    border: plan.primary ? 'none' : '1px solid rgba(226,114,91,0.4)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = plan.primary ? '#F48B76' : 'rgba(226,114,91,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = plan.primary ? '#E2725B' : 'transparent'; }}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-32 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 600, letterSpacing: '-0.03em', color: '#FAFAFA', marginBottom: '1.5rem', lineHeight: 1 }}>
            Ready to go live?
          </h2>
          <p style={{ color: '#A1A1AA', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
            Join businesses already running on BFF.
          </p>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-semibold transition-all cursor-pointer"
            style={{ backgroundColor: '#E2725B', color: '#FAFAFA' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F48B76'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#E2725B'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Get started — it's free <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-10 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#FAFAFA' }}>BFF</span>
          <p style={{ color: '#A1A1AA', fontSize: '0.8rem' }}>© 2026 EPIC Communications. All rights reserved.</p>
          <div className="flex gap-6 text-sm" style={{ color: '#A1A1AA' }}>
            <a href="/privacy" className="hover:text-[#FAFAFA] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#FAFAFA] transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
