"use client";

import React from "react";
import { motion } from "motion/react";
import {
  ArrowRight, Bot, Shield, Zap, MessageSquare, CheckCircle2,
  Sparkles, Phone, Brain, Globe, ChevronRight,
} from "lucide-react";
import { TEMPLATES } from "@/app/lib/templates";

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  const handleTemplateClick = (slug: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bff_template", slug);
    }
    onStart();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-indigo-500/8 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">BFF</span>
          <span className="text-gray-600 text-xs ml-1 hidden sm:block">AI Personal Assistant</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#templates" className="hover:text-white transition-colors">Templates</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <button
          onClick={onStart}
          className="bg-white/10 backdrop-blur-sm text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all cursor-pointer border border-white/10"
        >
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-20 pb-16 max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-wider text-indigo-300 uppercase bg-indigo-500/10 rounded-full border border-indigo-500/20">
            Powered by BFF
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.05] tracking-tight">
            Your AI,<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Your Rules.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            An AI assistant that works for <em>you</em> — whether you run a business, study for exams, or just need help staying organized. Set it up in 60 seconds.
          </p>
        </motion.div>

        {/* 3-step visual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-center gap-2 md:gap-4 mb-12 flex-wrap"
        >
          {[
            { step: "1", label: "Pick your AI" },
            { step: "2", label: "Sign up" },
            { step: "3", label: "Start chatting" },
          ].map((item, i) => (
            <React.Fragment key={item.step}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <span className="text-sm font-semibold text-gray-300">{item.label}</span>
              </div>
              {i < 2 && <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 text-sm text-gray-600 flex-wrap"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-500" />
            Live in 60 seconds
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-500" />
            You stay in control
          </span>
        </motion.div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-12 border-y border-gray-800/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">
            Join 500+ businesses already using BFF
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { emoji: "🏪", label: "Retail" },
              { emoji: "🏥", label: "Healthcare" },
              { emoji: "🏠", label: "Real Estate" },
              { emoji: "🍕", label: "Food & Bev" },
              { emoji: "💼", label: "Consulting" },
            ].map((industry) => (
              <span
                key={industry.label}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900/60 border border-gray-800 rounded-full text-sm text-gray-400 font-medium"
              >
                {industry.emoji} {industry.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">How it works</h2>
            <p className="text-gray-500">From zero to AI-powered in under a minute.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "🤖", step: "1", title: "Pick a template", desc: "Choose from 7 AI personalities built for your business. Each one is pre-trained and ready to go." },
              { icon: "📱", step: "2", title: "Connect WhatsApp", desc: "Link your WhatsApp in 30 seconds. No technical setup, no downloads — just scan and go." },
              { icon: "🚀", step: "3", title: "Go live", desc: "Your AI starts handling messages instantly. It learns your style and gets smarter every day." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t border-dashed border-gray-800" />
                )}
                <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 relative z-10">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Step {item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates — MAIN CTA */}
      <section id="templates" className="relative z-10 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Pick your AI. Get started in seconds.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Choose a template and your agent is ready instantly — it'll get to know you through conversation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl, i) => (
              <motion.div
                key={tpl.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-gray-900/80 transition-all group cursor-pointer relative overflow-hidden"
                onClick={() => handleTemplateClick(tpl.slug)}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tpl.color} opacity-60`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-2xl mb-4`}>
                  {tpl.emoji}
                </div>
                <h3 className="font-bold text-lg mb-1">{tpl.name}</h3>
                <p className="text-sm text-indigo-300/70 mb-2">{tpl.tagline}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{tpl.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-indigo-400 group-hover:text-indigo-300 transition-colors text-sm font-semibold">
                  Get Started <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}

            {/* Custom / Build from scratch card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: TEMPLATES.length * 0.07 }}
              className="border-2 border-dashed border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-indigo-500/40 transition-all cursor-pointer"
              onClick={() => handleTemplateClick("custom")}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">
                ✨
              </div>
              <div>
                <p className="font-bold">Build from Scratch</p>
                <p className="text-sm text-gray-500 mt-1">Full control — your agent, your way</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                Get Started <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          </div>

          {/* Sign-up method benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 max-w-xl mx-auto bg-gray-900/40 border border-gray-800 rounded-2xl p-6"
          >
            <p className="text-sm font-semibold text-gray-400 mb-4 text-center uppercase tracking-wider">How you sign up matters</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center shrink-0 text-base">
                  🔵
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sign up with Google</p>
                  <p className="text-xs text-gray-500 mt-0.5">Agent gets your calendar, email &amp; contacts automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600/20 border border-blue-600/30 rounded-lg flex items-center justify-center shrink-0 text-base">
                  🔵
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sign up with Facebook</p>
                  <p className="text-xs text-gray-500 mt-0.5">Agent gets your Instagram &amp; business pages</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-700/40 border border-gray-700 rounded-lg flex items-center justify-center shrink-0 text-base">
                  ✉️
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sign up with email</p>
                  <p className="text-xs text-gray-500 mt-0.5">Start basic, connect services later</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Everything your agent needs</h2>
            <p className="text-gray-500">One AI, all your channels. Set it up once, it runs forever.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: "Lives on WhatsApp", desc: "Message your AI like you'd message a friend. It replies instantly, 24/7 — no app to download.", color: "text-green-400 bg-green-500/10 border-green-500/20" },
              { icon: Phone, title: "Takes Phone Calls", desc: "Give it a real number. It answers calls, takes messages, and texts you a summary.", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              { icon: Shield, title: "You Set the Rules", desc: "Control what it can do. Review everything, or let it run on autopilot — your call.", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { icon: Brain, title: "Google & Instagram Ready", desc: "Sign up with Google or Facebook and your agent instantly connects to your calendar, email, contacts, and social pages.", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
              { icon: Zap, title: "Ready in 60 Seconds", desc: "Pick a template, sign up, done. Your agent meets you on WhatsApp and gets to know you through conversation.", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
              { icon: Globe, title: "Always On", desc: "WhatsApp, email, phone — your AI works while you sleep, study, or enjoy your weekend.", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-gray-700 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color} mb-4 border`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Simple Pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you need more power.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Free</h3>
              <div className="text-4xl font-extrabold mb-2">$0 <span className="text-base font-normal text-gray-600">/mo</span></div>
              <p className="text-sm text-gray-500 mb-6">Try it, no strings attached</p>
              <ul className="space-y-2.5 mb-8 flex-grow">
                {["1 AI agent", "50 messages/day", "WhatsApp only", "Basic setup"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-gray-600 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-bold border border-gray-700 text-gray-300 hover:bg-gray-800 transition cursor-pointer">
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-indigo-900/60 to-violet-900/60 border border-indigo-500/40 rounded-2xl p-7 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-lg font-bold mb-1">Pro</h3>
              <div className="text-4xl font-extrabold mb-2">$29 <span className="text-base font-normal text-indigo-300/60">/mo</span></div>
              <p className="text-sm text-gray-400 mb-6">For people who mean business</p>
              <ul className="space-y-2.5 mb-8 flex-grow">
                {["3 AI agents", "Unlimited messages", "All channels (WhatsApp + Phone + Email)", "Phone number included", "Knowledge base", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition cursor-pointer shadow-lg shadow-indigo-500/20">
                Start Free Trial
              </button>
            </div>

            {/* Business */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Business</h3>
              <div className="text-4xl font-extrabold mb-2">$99 <span className="text-base font-normal text-gray-600">/mo</span></div>
              <p className="text-sm text-gray-500 mb-6">Run your whole operation on AI</p>
              <ul className="space-y-2.5 mb-8 flex-grow">
                {["Unlimited agents", "All channels", "Custom integrations", "Dedicated support", "SLA guarantee", "White-label ready"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-yellow-500 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-bold border border-gray-700 text-gray-300 hover:bg-gray-800 transition cursor-pointer">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Your AI is waiting</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            60 seconds to set up. Free to start. No credit card needed.
          </p>
          <button
            onClick={onStart}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer shadow-2xl shadow-indigo-500/20 flex items-center gap-3 mx-auto"
          >
            Create Your Agent
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-gray-800/50 text-center text-gray-600 text-xs space-y-2">
        <p>© 2026 BFF AI — Powered by EPIC Communications</p>
        <p className="flex items-center justify-center gap-4">
          <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</a>
          <span>·</span>
          <a href="mailto:info@epic.dm" className="hover:text-gray-400 transition-colors">Contact</a>
        </p>
      </footer>
    </div>
  );
}
