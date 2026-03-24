export const metadata = { title: "Privacy Policy — BFF AI" };

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA]/80 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#A1A1AA] mb-8">Last updated: March 8, 2026</p>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Who We Are</h2>
          <p>BFF AI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a product of EPIC Communications Inc., located in Roseau, Dominica. We provide AI-powered personal assistant services via our platform at bff.epic.dm.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. Information We Collect</h2>
          <p>When you use BFF AI, we may collect:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><strong>Account info:</strong> Name, email address, phone number (provided during signup via Google, Facebook, or email)</li>
            <li><strong>WhatsApp messages:</strong> Messages you send to and receive from your AI agent</li>
            <li><strong>Business data:</strong> Information from URLs you provide during onboarding (publicly available data only)</li>
            <li><strong>Usage data:</strong> Reminders, bills, to-dos, and other items you ask your agent to track</li>
            <li><strong>Device info:</strong> Browser type, IP address, and general location for security purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>To provide and improve our AI assistant services</li>
            <li>To process your requests (reminders, messages, bill tracking)</li>
            <li>To send you WhatsApp messages from your AI agent</li>
            <li>To authenticate your identity and secure your account</li>
            <li>To communicate service updates and support</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. AI & Third-Party Services</h2>
          <p>Your messages are processed by AI language models (such as DeepSeek) to generate responses. We send only the content necessary to produce a response. We do not sell your data to third parties.</p>
          <p className="mt-2">We use the following third-party services:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><strong>Clerk:</strong> Authentication (Google, Facebook, email sign-in)</li>
            <li><strong>WhatsApp Cloud API (Meta):</strong> Messaging</li>
            <li><strong>DeepSeek:</strong> AI language model for agent responses</li>
            <li><strong>Vercel:</strong> Hosting</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Data Storage & Security</h2>
          <p>Your data is stored on secure servers. We use encryption in transit (HTTPS/TLS) and restrict access to authorized personnel only. Conversation history is retained to provide context to your AI agent and may be deleted upon request.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Withdraw consent at any time by discontinuing use</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at <a href="mailto:info@epic.dm" className="text-[#E2725B] hover:underline">info@epic.dm</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">7. Data Retention</h2>
          <p>We retain your data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">8. Children&apos;s Privacy</h2>
          <p>BFF AI is not intended for children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us data, please contact us and we will delete it.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">9. Changes to This Policy</h2>
          <p>We may update this policy from time to time. Changes will be posted on this page with an updated date. Continued use of the service after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">10. Contact Us</h2>
          <p>EPIC Communications Inc.<br/>Roseau, Dominica<br/>Email: <a href="mailto:info@epic.dm" className="text-[#E2725B] hover:underline">info@epic.dm</a><br/>Phone: +1 (767) 285-8382</p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-white/[0.07] text-center text-[#A1A1AA] text-xs">
        <p>© 2026 BFF AI — Powered by EPIC Communications Inc.</p>
      </div>
    </div>
  );
}
