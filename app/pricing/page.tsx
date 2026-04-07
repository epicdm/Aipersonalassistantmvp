import React from 'react';
import { CheckCircle2, ShieldCheck, Phone, MessageSquare, Globe, Zap, Clock, Users, Bot, Flag, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'XCD/mo',
    description: 'Try your personal AI — no card required',
    badge: null,
    features: [
      { text: '1 AI agent (your personality, your name)', included: true },
      { text: '50 AI messages per month', included: true },
      { text: 'WhatsApp integration', included: true },
      { text: 'Web dashboard', included: true },
      { text: '767-818 Dominican number', included: false },
      { text: 'Calling minutes', included: false },
      { text: 'Voicemail transcription', included: false },
      { text: 'Priority AI (Claude)', included: false },
    ],
    cta: 'Start Free',
    ctaLink: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$68',
    period: 'XCD/mo',
    usdNote: '≈ $25 USD',
    description: 'Your number. Your AI. Available 24/7.',
    badge: 'Most Popular',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Your own 767-818 Dominican number', included: true },
      { text: 'Unlimited AI messages', included: true },
      { text: '60 calling minutes per month', included: true },
      { text: 'AI answers your calls', included: true },
      { text: 'Voicemail transcription', included: true },
      { text: 'Priority AI (Claude)', included: false },
      { text: 'Multiple agents', included: false },
    ],
    cta: 'Get Your Number',
    ctaLink: '/signup',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$270',
    period: 'XCD/mo',
    usdNote: '≈ $100 USD',
    description: 'AI receptionist for your business — 24/7, never misses a call',
    badge: null,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Priority AI — Claude Sonnet', included: true },
      { text: 'Up to 5 AI agents', included: true },
      { text: '300 calling minutes per month', included: true },
      { text: 'Calendar booking integration', included: true },
      { text: 'Call summaries to WhatsApp', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Priority phone support', included: true },
    ],
    cta: 'Get Started',
    ctaLink: '/signup',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    usdNote: '',
    description: 'White-label BFF for your organization or island',
    badge: null,
    features: [
      { text: 'Unlimited agents', included: true },
      { text: 'Unlimited calling minutes', included: true },
      { text: 'Full API access', included: true },
      { text: 'Custom AI training on your data', included: true },
      { text: 'Custom branding', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'OECS regional deployment', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
    highlight: false,
  },
];

  const faqs = [
  {
    question: 'Do I get a real Dominican number?',
    answer: 'Yes — Pro and above plans include a real 767-818 number. People can call it from anywhere in the world. Your AI answers, takes messages, and sends you a summary on WhatsApp.',
  },
  {
    question: 'Can people call my number from overseas?',
    answer: 'Yes. Your Dominican number works worldwide. Callers pay standard international rates to call Dominica. Great for diaspora and international clients.',
  },
  {
    question: 'How do I make outbound calls?',
    answer: 'From the BFF web app or companion mobile app. Your 767-818 number shows as the caller ID. No separate calling app needed.',
  },
  {
    question: 'What is the AI agent exactly?',
    answer: 'A personal AI assistant you configure — name it, give it a personality, tell it what it does. It chats on WhatsApp and answers phone calls on your behalf 24/7.',
  },
  {
    question: 'Can I use BFF for my business?',
    answer: 'Absolutely — the Business plan is designed as an AI receptionist. It answers calls, books appointments, handles FAQs, and sends you summaries. No human receptionist needed.',
  },
  {
    question: 'How quickly do I get my number?',
    answer: 'Instantly. After upgrading to Pro, your 767-818 number is assigned within seconds.',
  },
];
  const tableRows = [
    ['767-818 Dominican Number', '—', '✓', '✓', '✓'],
    ['AI Agent(s)', '1', '1', 'Up to 5', 'Unlimited'],
    ['AI Messages', '50/mo', 'Unlimited', 'Unlimited', 'Unlimited'],
    ['Calling Minutes', '—', '60/mo', '300/mo', 'Unlimited'],
    ['AI Answers Your Calls', '—', '✓', '✓', '✓'],
    ['WhatsApp Integration', '✓', '✓', '✓', '✓'],
    ['Voicemail Transcription', '—', '✓', '✓', '✓'],
    ['Priority AI (Claude)', '—', '—', '✓', '✓'],
    ['Calendar Booking', '—', '—', '✓', '✓'],
    ['API Access', '—', '—', '—', '✓'],
    ['Support', 'Email', 'Email', 'Phone', 'Dedicated'],
  ];

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2563eb] to-[#1e40af] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <Link href="/" className="font-bold text-lg">BFF by EPIC</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">Home</Link>
            <Link href="/pricing" className="text-[#2563eb] font-semibold text-sm">Pricing</Link>
            <Link href="/signup" className="bg-white/10 px-4 py-2 rounded-lg text-sm hover:bg-white/20">Sign In</Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-400 mb-10">
          Start free. Get your Dominican number. Let AI answer your calls.<br />
          <span className="text-gray-500 text-base">For personal use or your business — plans start at $68 XCD/month.</span>
        </p>
        <div className="inline-flex items-center gap-2 bg-[#2563eb]/10 text-[#2563eb] px-4 py-2 rounded-full text-sm font-semibold">
          <Flag className="w-4 h-4" />
          🇩🇲 All prices in Eastern Caribbean Dollars (XCD)
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-10 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 flex flex-col ${plan.highlight ? 'bg-gradient-to-br from-[#2563eb]/20 to-[#1e40af]/10 border-2 border-[#2563eb]/30 relative' : 'bg-gray-900/50 border border-gray-800'}`}
            >
              {plan.highlight && (
                <div className="absolute top-4 right-4 bg-[#2563eb] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-gray-500 ml-2">/{plan.period}</span>
                </div>
                {plan.usdNote && <p className="text-xs text-gray-500 mt-1">{plan.usdNote}</p>}
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    {feature.included ? (
                      <CheckCircle2 className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-700 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaLink}
                className={`w-full py-3 rounded-xl font-bold text-center transition-all ${plan.highlight ? 'bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white hover:from-[#1e40af] hover:to-[#1e3a8a]' : 'border border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10'}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Detailed Feature Comparison</h2>
          <p className="text-gray-500">See exactly what each plan includes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-4 px-6 font-semibold">Feature</th>
                <th className="text-center py-4 px-6 font-semibold">Free</th>
                <th className="text-center py-4 px-6 font-semibold">Pro</th>
                <th className="text-center py-4 px-6 font-semibold">Business</th>
                <th className="text-center py-4 px-6 font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['767-818 Dominican Number', '—', '✓', '✓', '✓'],
                ['AI Agent(s)', '1', '1', 'Up to 5', 'Unlimited'],
                ['AI Messages', '50/mo', 'Unlimited', 'Unlimited', 'Unlimited'],
                ['Calling Minutes', '—', '60/mo', '300/mo', 'Unlimited'],
                ['AI Answers Your Calls', '—', '✓', '✓', '✓'],
                ['WhatsApp Integration', '✓', '✓', '✓', '✓'],
                ['Voicemail Transcription', '—', '✓', '✓', '✓'],
                ['Priority AI (Claude)', '—', '—', '✓', '✓'],
                ['Calendar Booking', '—', '—', '✓', '✓'],
                ['API Access', '—', '—', '—', '✓'],
                ['Support', 'Email', 'Email', 'Phone', 'Dedicated'],
              ].map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                  <td className="py-4 px-6 font-medium">{row[0]}</td>
                  <td className="text-center py-4 px-6">{row[1]}</td>
                  <td className="text-center py-4 px-6">{row[2]}</td>
                  <td className="text-center py-4 px-6">{row[3]}</td>
                  <td className="text-center py-4 px-6">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-500">Everything you need to know about BFF</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-3">{faq.question}</h3>
              <p className="text-gray-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Ready to get your Dominican AI?</h2>
          <p className="text-gray-400 mb-8">Join thousands who trust BFF for their Dominican communication needs.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white hover:from-[#1e40af] hover:to-[#1e3a8a] transition-all"
            >
              Get Your Number Free
            </Link>
            <Link
              href="/"
              className="px-8 py-4 rounded-xl font-bold text-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-[#2563eb] to-[#1e40af] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold">BFF by EPIC</span>
            </div>
            <p className="text-gray-600 text-sm mt-2">Powered by EPIC Communications — Roseau, Dominica 🇩🇲</p>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
