import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Bot, Shield, Zap, MessageSquare, CheckCircle2, Sparkles, Phone, Brain, Globe } from "lucide-react";

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-500/10 to-transparent rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">AIVA</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <button onClick={onStart} className="bg-white/10 backdrop-blur-sm text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all cursor-pointer border border-white/10">
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-24 pb-20 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-wider text-indigo-300 uppercase bg-indigo-500/10 rounded-full border border-indigo-500/20">
            Your AI, your rules
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Build someone who<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">works for you.</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create your own AI agent in minutes. It talks on WhatsApp, answers calls, sends emails, and manages your schedule — so you don't have to.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={onStart} className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer shadow-2xl shadow-indigo-500/20">
              Create your agent <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 rounded-xl font-bold text-lg text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-white transition-all cursor-pointer">
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-20 grid grid-cols-3 gap-3 max-w-2xl mx-auto"
        >
          {[
            { icon: MessageSquare, label: "WhatsApp", color: "text-green-400 bg-green-500/10 border-green-500/20" },
            { icon: Phone, label: "Phone Calls", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { icon: Brain, label: "AI Memory", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
          ].map((card, i) => (
            <div key={i} className={`p-4 rounded-2xl border bg-gray-900/50 backdrop-blur-sm ${card.color}`}>
              <card.icon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-300">{card.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything your agent needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">One AI, all your channels. Set it up once, it runs forever.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: "WhatsApp Native", desc: "Your agent lives on WhatsApp. It reads, replies, and reaches out — just like a real assistant.", color: "text-green-400 bg-green-500/10" },
              { icon: Phone, title: "Voice Calls", desc: "Give your agent a real phone number. It answers calls, takes notes, and follows up.", color: "text-blue-400 bg-blue-500/10" },
              { icon: Shield, title: "You're in Control", desc: "Set trust levels. Review before sending, or let your agent act autonomously.", color: "text-amber-400 bg-amber-500/10" },
              { icon: Brain, title: "It Remembers", desc: "Your agent learns your preferences, contacts, and patterns over time.", color: "text-violet-400 bg-violet-500/10" },
              { icon: Zap, title: "Instant Setup", desc: "Name it, choose a personality, connect your channels. Done in 5 minutes.", color: "text-yellow-400 bg-yellow-500/10" },
              { icon: Globe, title: "Works Everywhere", desc: "WhatsApp, email, phone, calendar — one agent across all channels.", color: "text-cyan-400 bg-cyan-500/10" },
            ].map((f, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-gray-700 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color} mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col">
              <h3 className="text-xl font-bold mb-1">Free</h3>
              <div className="text-4xl font-extrabold mb-6">$0 <span className="text-base font-normal text-gray-600">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-grow">
                {["50 messages/day", "1 channel (WhatsApp)", "Basic personality", "Community support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />{item}</li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-bold border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer">
                Get Started
              </button>
            </div>
            {/* Pro */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-violet-900/50 border border-indigo-500/30 rounded-2xl p-8 flex flex-col relative">
              <div className="absolute top-4 right-4 bg-indigo-500 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Popular</div>
              <h3 className="text-xl font-bold mb-1">Pro</h3>
              <div className="text-4xl font-extrabold mb-6">$29 <span className="text-base font-normal text-indigo-300/60">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-grow">
                {["Unlimited messages", "All channels (WhatsApp + Phone + Email)", "Custom personality & voice", "Phone number included", "Knowledge base", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300"><CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />{item}</li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer shadow-lg shadow-indigo-500/20">
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to build your agent?</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">It takes less than 5 minutes. No credit card required.</p>
        <button onClick={onStart} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer shadow-2xl shadow-indigo-500/20">
          Create Your Agent
        </button>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-gray-800/50 text-center text-gray-600 text-xs">
        <p>© 2026 AIVA. Built with OpenClaw.</p>
      </footer>
    </div>
  );
}
