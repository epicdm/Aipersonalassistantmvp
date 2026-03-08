"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Bot, Shield, Zap, MessageSquare, CheckCircle2,
  Sparkles, Phone, Brain, Globe, Loader2, Building2,
  MapPin, Clock, ChevronRight, Star,
} from "lucide-react";
import { TEMPLATES } from "@/app/lib/templates";

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<null | { name: string; industry: string; description: string; services: string[] }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      inputRef.current?.focus();
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/business/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPreview(data.data);
      }
    } catch {
      // ignore — just send them to signup
    } finally {
      setScanning(false);
    }
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

        {/* URL Scan Hero — the wow moment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-xl mx-auto"
        >
          <form onSubmit={handleScan} className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourwebsite.com or facebook.com/you"
                className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl pl-12 pr-4 py-4 text-base outline-none transition-colors placeholder:text-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={scanning}
              className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60 whitespace-nowrap shadow-lg shadow-indigo-500/20"
            >
              {scanning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Scan <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Preview card */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-gray-900 border border-indigo-500/30 rounded-2xl p-5 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="font-bold text-lg">{preview.name}</p>
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full capitalize">
                        {preview.industry}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{preview.description}</p>
                    {preview.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {preview.services.slice(0, 5).map((s, i) => (
                          <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Store FULL scan result so creation flow skips the scan step
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("bff_business", JSON.stringify(preview));
                      sessionStorage.setItem("bff_scan_url", url);
                    }
                    onStart();
                  }}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Set up AI for {preview.name}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!preview && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={onStart}
                className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                Or sign up without a website →
              </button>
            </div>
          )}
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-600 flex-wrap"
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

      {/* Templates section */}
      <section id="templates" className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Pick your AI, make it yours</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Templates for life, school, and work. Pick one and your agent is ready in seconds — or build your own from scratch.
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
                className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-all group cursor-pointer relative overflow-hidden"
                onClick={onStart}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tpl.color} opacity-60`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-2xl mb-4`}>
                  {tpl.emoji}
                </div>
                <h3 className="font-bold text-lg mb-1">{tpl.name}</h3>
                <p className="text-sm text-indigo-300/70 mb-2">{tpl.tagline}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{tpl.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-gray-600 group-hover:text-indigo-400 transition-colors text-sm font-medium">
                  Get started <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}

            {/* CTA card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: TEMPLATES.length * 0.07 }}
              className="border-2 border-dashed border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-gray-600 transition-all cursor-pointer"
              onClick={onStart}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">
                ✨
              </div>
              <div>
                <p className="font-bold">Build from Scratch</p>
                <p className="text-sm text-gray-500 mt-1">Full control — configure every detail</p>
              </div>
            </motion.div>
          </div>
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
              { icon: Brain, title: "Learns Over Time", desc: "The more you use it, the smarter it gets. Remembers your preferences, contacts, and habits.", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
              { icon: Zap, title: "Ready in 60 Seconds", desc: "Pick a template, name your agent, done. No tech skills needed. No code. No setup guides.", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
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
      <footer className="relative z-10 py-8 border-t border-gray-800/50 text-center text-gray-600 text-xs">
        <p>© 2026 BFF AI — Powered by EPIC Communications</p>
      </footer>
    </div>
  );
}
