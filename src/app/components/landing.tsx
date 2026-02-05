import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Bot, Shield, Zap, MessageSquare, CheckCircle2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-indigo-600">
          <Bot className="w-8 h-8" />
          <span>AIVA</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
        </div>
        <button 
          onClick={onStart}
          className="bg-indigo-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
        >
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-16 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-indigo-600 uppercase bg-indigo-50 rounded-full">
            The future of personal productivity
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Your AI Agent, <br />
            <span className="text-indigo-600">Always On.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automate your life across WhatsApp, Email, and Calendar. Build your personal AI assistant in minutes, not days.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all cursor-pointer shadow-lg hover:shadow-indigo-200"
            >
              Create your agent <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg border-2 border-gray-200 hover:border-gray-300 transition-all cursor-pointer">
              Watch Demo
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-16 rounded-3xl overflow-hidden shadow-2xl border-8 border-gray-50"
        >
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1761311984022-6a118699b0e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwb2ZmaWNlJTIwdGVjaHxlbnwxfHx8fDE3NzAzMjk0NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Dashboard Preview"
            className="w-full h-auto"
          />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for your daily flow</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Everything you need to stay on top of your schedule and communication.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: MessageSquare, title: "WhatsApp Native", desc: "Interact with your assistant right where you talk to friends." },
              { icon: Zap, title: "Deep Integration", desc: "Connect your Google Calendar, Outlook, and Notion workspace." },
              { icon: Shield, title: "Private & Secure", desc: "Your data is encrypted and never sold to third parties." }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-6">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-gray-600">Choose the plan that fits your lifestyle.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl border-2 border-gray-100 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <div className="text-4xl font-extrabold mb-6">$0 <span className="text-lg font-normal text-gray-500">/mo</span></div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Basic Email Integration</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> WhatsApp (100 msgs/mo)</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> 1 Tool Selection</li>
            </ul>
            <button 
              onClick={onStart}
              className="w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
          <div className="p-8 rounded-2xl bg-indigo-900 text-white relative overflow-hidden flex flex-col">
            <div className="absolute top-4 right-4 bg-indigo-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Coming Soon</div>
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <div className="text-4xl font-extrabold mb-6">$19 <span className="text-lg font-normal text-indigo-300">/mo</span></div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Unlimited WhatsApp</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> All Tool Integrations</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Custom Agent Personality</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Priority Support</li>
            </ul>
            <button className="w-full py-3 rounded-xl font-bold bg-white text-indigo-900 hover:bg-gray-100 transition-all opacity-50 cursor-not-allowed">
              Join Waitlist
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-gray-50 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "How does the WhatsApp connection work?", a: "Once you create your agent, you'll get a QR code to link your account, similar to WhatsApp Web. Your agent will then respond to your private messages." },
              { q: "Is my calendar data safe?", a: "Yes, we only access the data required to manage your schedule. We use enterprise-grade encryption and never share your data." },
              { q: "Can I customize the agent's name?", a: "Absolutely! You can name your assistant and give it a specific purpose in the agent settings." }
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                <h4 className="font-bold text-lg mb-2">{item.q}</h4>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 text-center text-gray-500 text-sm">
        <p>© 2026 AIVA AI Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}
