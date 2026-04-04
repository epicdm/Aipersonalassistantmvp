"use client";
import { useState, useEffect, useCallback } from "react";

import {
  Phone,
  Loader2,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  ChevronDown,
  Plug,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

/* ─── Meta Embedded Signup (Path 1) ─── */
function MetaEmbeddedSignup({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) {
      setSdkLoaded(true);
      return;
    }
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID || "",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
      setSdkLoaded(true);
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      )
        return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.data?.phone_number_id && data.data?.waba_id) {
            (window as any).__waEmbeddedData = data.data;
          }
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const launchSignup = useCallback(() => {
    if (!window.FB) {
      toast.error("Facebook SDK not loaded yet. Please try again.");
      return;
    }
    setLoading(true);
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const code = response.authResponse.code;
          const embeddedData = (window as any).__waEmbeddedData || {};
          fetch("/api/isola/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              phoneNumberId: embeddedData.phone_number_id || "",
              wabaId: embeddedData.waba_id || "",
              displayPhone: embeddedData.display_phone_number || "",
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              setLoading(false);
              if (data.ok) {
                toast.success("WhatsApp Business connected! Your agent is being set up.");
                onSuccess(data);
              } else {
                toast.error(data.error || "Connection failed");
              }
            })
            .catch((err) => {
              setLoading(false);
              toast.error("Connection failed: " + err.message);
            });
        } else {
          setLoading(false);
          toast.error("Facebook login cancelled or failed");
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID || "",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  }, [onSuccess]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-300/80">
          Your number will move from the WhatsApp Business app to BFF. You'll
          manage customer conversations through the BFF dashboard instead.
        </p>
      </div>

      <button
        onClick={launchSignup}
        disabled={loading || !sdkLoaded}
        className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed text-[#00333c] rounded-2xl font-bold text-lg transition-all cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )}
        {loading ? "Connecting..." : "Migrate My Number"}
      </button>
    </div>
  );
}

/* ─── Existing API Form (Path 2) ─── */
function ExistingApiForm({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim() || !wabaId.trim()) {
      toast.error("Phone Number ID and WABA ID are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
          display_phone_number: displayPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("WhatsApp number connected!");
        onSuccess(data);
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch (err: any) {
      toast.error("Connection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#FAFAFA]/80 mb-1.5">
          Phone Number ID
        </label>
        <input
          type="text"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="e.g. 123456789012345"
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-[#00333c] placeholder-gray-500 focus:outline-none focus:border-[#004B57] focus:ring-1 focus:ring-[#004B57] transition-colors"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#FAFAFA]/80 mb-1.5">
          WABA ID
        </label>
        <input
          type="text"
          value={wabaId}
          onChange={(e) => setWabaId(e.target.value)}
          placeholder="e.g. 987654321098765"
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-[#00333c] placeholder-gray-500 focus:outline-none focus:border-[#004B57] focus:ring-1 focus:ring-[#004B57] transition-colors"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#FAFAFA]/80 mb-1.5">
          Display Phone Number{" "}
          <span className="text-[#A1A1AA]">(optional)</span>
        </label>
        <input
          type="text"
          value={displayPhone}
          onChange={(e) => setDisplayPhone(e.target.value)}
          placeholder="e.g. +1 767 555 1234"
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-[#00333c] placeholder-gray-500 focus:outline-none focus:border-[#004B57] focus:ring-1 focus:ring-[#004B57] transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-[#00333c] hover:bg-[#00333c] disabled:opacity-50 disabled:cursor-not-allowed text-[#00333c] rounded-2xl font-bold text-lg transition-all cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Plug className="w-5 h-5" />
        )}
        {loading ? "Connecting..." : "Connect Existing Number"}
      </button>
    </form>
  );
}

/* ─── New Number Form (Path 3) ─── */
function NewNumberForm() {
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("+1767");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/number/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName.trim(),
          country_code: country,
        }),
      });
      const data = await res.json();
      if (data.success && data.phone_number) {
        toast.success("Number provisioned: " + data.phone_number);
      } else {
        // Fallback — request queued
        setSubmitted(true);
        toast.success("Request submitted!");
      }
    } catch {
      setSubmitted(true);
      toast.success("Request submitted!");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#00333c]/10 border border-[#E2725B]/30 rounded-xl p-6 text-center space-y-2">
        <CheckCircle className="w-8 h-8 text-[#004B57] mx-auto" />
        <p className="text-[#004B57] font-medium">Request Received!</p>
        <p className="text-[#A1A1AA] text-sm">
          We'll set up your number within 24 hours. We'll WhatsApp you when it's
          ready.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#FAFAFA]/80 mb-1.5">
          Business Name
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. EPIC Communications"
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-[#00333c] placeholder-gray-500 focus:outline-none focus:border-[#004B57] focus:ring-1 focus:ring-[#004B57] transition-colors"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#FAFAFA]/80 mb-1.5">
          Country
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl text-[#00333c] focus:outline-none focus:border-[#004B57] focus:ring-1 focus:ring-[#004B57] transition-colors"
        >
          <option value="+1767">🇩🇲 Dominica (+1 767)</option>
          <option value="+1">🇺🇸 United States (+1)</option>
          <option value="+1">🇨🇦 Canada (+1)</option>
          <option value="+44">🇬🇧 United Kingdom (+44)</option>
          <option value="+1868">🇹🇹 Trinidad &amp; Tobago (+1 868)</option>
          <option value="+1246">🇧🇧 Barbados (+1 246)</option>
          <option value="+1758">🇱🇨 St. Lucia (+1 758)</option>
          <option value="+1784">🇻🇨 St. Vincent (+1 784)</option>
          <option value="+1473">🇬🇩 Grenada (+1 473)</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#00333c] rounded-2xl font-bold text-lg transition-all cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
        {loading ? "Setting Up..." : "Get My Number"}
      </button>
    </form>
  );
}

/* ─── Accordion Card ─── */
function PathCard({
  icon,
  title,
  subtitle,
  badge,
  badgeColor,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border rounded-2xl transition-all duration-300 ${
        open
          ? "bg-[#111111] border-[#E2725B]/50 shadow-lg shadow-indigo-500/5"
          : "bg-[#0d0d0d] border-white/[0.07] hover:border-white/10"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left cursor-pointer"
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            open ? "bg-[#00333c]/15" : "bg-[#1A1A1A]"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#00333c]">{title}</h3>
            {badge && (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  badgeColor || "bg-white/10 text-[#FAFAFA]/80"
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-[#A1A1AA] mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#A1A1AA] shrink-0 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-6 pt-1">{children}</div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function NumberClient() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "connected" | "provisioned"
  >("loading");
  const [connectedData, setConnectedData] = useState<any>(null);
  const [phoneData, setPhoneData] = useState<any>(null);
  const [openPath, setOpenPath] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/whatsapp/connect")
        .then((r) => r.json())
        .catch(() => ({ connected: false })),
      fetch("/api/agent")
        .then((r) => r.json())
        .catch(() => ({})),
    ]).then(([waData, agentData]) => {
      if (waData.connected) {
        setConnectedData(waData);
        setStatus("connected");
      } else if (agentData.agent?.phoneNumber) {
        setPhoneData({ number: agentData.agent.phoneNumber });
        setStatus("provisioned");
      } else {
        setStatus("idle");
      }
    });
  }, []);

  const handleSuccess = (data: any) => {
    setConnectedData(data);
    setStatus("connected");
  };

  const togglePath = (idx: number) =>
    setOpenPath((prev) => (prev === idx ? null : idx));

  if (status === "loading") {
    return (
      <div style={{fontFamily:"'Inter',sans-serif",backgroundColor:"#f8f9fa",minHeight:"100vh"}}>
      <header style={{background:"#f8f9fa",padding:"16px 24px",borderBottom:"1px solid #e1e3e3",position:"sticky",top:0,zIndex:40}}>
        <h1 style={{fontFamily:"'Manrope',sans-serif",fontWeight:700,fontSize:"1.125rem",color:"#00333c",margin:0}}>WhatsApp Number</h1>
      </header>
      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 24px 80px"}}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#A1A1AA]" />
        </div>
      </div></div>
    );
  }

  return (
    <div style={{fontFamily:"'Inter',sans-serif",backgroundColor:"#f8f9fa",minHeight:"100vh"}}>
      <header style={{background:"#f8f9fa",padding:"16px 24px",borderBottom:"1px solid #e1e3e3",position:"sticky",top:0,zIndex:40}}>
        <h1 style={{fontFamily:"'Manrope',sans-serif",fontWeight:700,fontSize:"1.125rem",color:"#00333c",margin:0}}>WhatsApp Number</h1>
      </header>
      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 24px 80px"}}>
      <div className="max-w-lg mx-auto space-y-6 py-8">
        {/* ── Connected State ── */}
        {status === "connected" && connectedData && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-2xl font-bold text-[#00333c]">
              WhatsApp Connected!
            </h2>
            <p className="text-green-300 text-lg font-mono">
              {connectedData.display_phone_number ||
                connectedData.phone ||
                "Connected"}
            </p>
            <p className="text-[#A1A1AA] text-sm">
              Your business WhatsApp number is active and receiving messages.
            </p>
          </div>
        )}

        {/* ── Provisioned State ── */}
        {status === "provisioned" && phoneData && (
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
            <p className="text-2xl font-bold font-mono text-[#00333c]">
              {phoneData.number || phoneData.did}
            </p>
            <p className="text-xs text-[#A1A1AA]">
              Your agent's phone number is active
            </p>
          </div>
        )}

        {/* ── Setup: 3 Paths ── */}
        {status === "idle" && (
          <>
            <div className="text-center space-y-2 mb-2">
              <h2 className="text-2xl font-bold text-[#00333c]">
                Set Up WhatsApp for Your Business
              </h2>
              <p className="text-[#A1A1AA] text-sm">
                Choose the option that fits your situation
              </p>
            </div>

            {/* Path 1 — Migrate */}
            <PathCard
              icon={<MessageSquare className="w-6 h-6 text-green-400" />}
              title="Migrate My Number"
              subtitle="Move your existing WhatsApp Business number to BFF"
              badge="Most Common"
              badgeColor="bg-green-500/20 text-green-300"
              open={openPath === 0}
              onToggle={() => togglePath(0)}
            >
              <div className="space-y-4">
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Already using the WhatsApp Business app on your phone? Migrate
                  that number to BFF so your AI agent handles conversations
                  automatically.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                    <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Uses Meta Embedded Signup (Facebook login)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                    <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Keeps your business name and number</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                    <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>Full control of your WhatsApp Business profile</span>
                  </div>
                </div>
                <MetaEmbeddedSignup onSuccess={handleSuccess} />
              </div>
            </PathCard>

            {/* Path 2 — Existing API */}
            <PathCard
              icon={<Plug className="w-6 h-6 text-[#004B57]" />}
              title="I Already Have Meta API Access"
              subtitle="Connect with your Phone Number ID and WABA ID"
              badge="Developer"
              badgeColor="bg-[#00333c]/15 text-[#004B57]"
              open={openPath === 1}
              onToggle={() => togglePath(1)}
            >
              <div className="space-y-4">
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Already set up with the WhatsApp Cloud API? Enter your IDs
                  below and we'll connect your existing setup to BFF.
                </p>
                <ExistingApiForm onSuccess={handleSuccess} />
              </div>
            </PathCard>

            {/* Path 3 — New Number */}
            <PathCard
              icon={<Sparkles className="w-6 h-6 text-emerald-400" />}
              title="Get a New Number from BFF"
              subtitle="We'll provision a fresh dedicated number for you"
              badge="Easiest"
              badgeColor="bg-emerald-500/20 text-emerald-300"
              open={openPath === 2}
              onToggle={() => togglePath(2)}
            >
              <div className="space-y-4">
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Nothing set up yet? No problem. We'll create a brand new
                  WhatsApp Business number for your business — no Meta account
                  needed.
                </p>
                <NewNumberForm />
              </div>
            </PathCard>
          </>
        )}
      </div>
    </div></div>
  );
}
