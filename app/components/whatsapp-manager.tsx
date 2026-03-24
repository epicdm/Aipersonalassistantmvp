import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Settings2,
  Clock,
  QrCode,
  Power,
  Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface WhatsAppManagerProps {
  status: string;
  phoneNumber: string;
  onUpdate: (config: any) => void;
  onGenerate?: () => Promise<{ pairingCode: string; qrDataUrl: string }>;
  qrDataUrl?: string | null;
}

export function WhatsAppManager({ status, phoneNumber, onUpdate, onGenerate, qrDataUrl }: WhatsAppManagerProps) {
  const [connectionStep, setConnectionStep] = useState<"idle" | "pairing" | "connected">(
    status === "Connected" ? "connected" : "idle"
  );
  const [pairingCode, setPairingCode] = useState("");
  const [qr, setQr] = useState<string | null>(qrDataUrl || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [settings, setSettings] = useState({
    autoReplyDelay: 2,
    markAsRead: true,
    typingIndicator: true,
    restrictToContacts: false,
    dailyLimit: 500
  });

  const generatePairingCode = async () => {
    setIsRefreshing(true);
    try {
      if (onGenerate) {
        const res = await onGenerate();
        setPairingCode(res.pairingCode);
        setQr(res.qrDataUrl);
      } else {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setPairingCode(code);
      }
      setConnectionStep("pairing");
      toast.success("New pairing code generated");
    } catch (e) {
      toast.error("Failed to generate pairing code");
    } finally {
      setIsRefreshing(false);
    }
  };

  const simulateConnection = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 3000)),
      {
        loading: 'Handshaking with WhatsApp servers...',
        success: () => {
          setConnectionStep("connected");
          onUpdate({ whatsappStatus: "Connected", phoneNumber: "+1 (555) 012-3456" });
          return 'Instance successfully linked!';
        },
        error: 'Failed to connect. Please try again.',
      }
    );
  };

  const disconnect = () => {
    setConnectionStep("idle");
    setPairingCode("");
    onUpdate({ whatsappStatus: "Disconnected", phoneNumber: "" });
    toast.info("WhatsApp instance disconnected");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto pb-12">
      {/* Connection Status Card */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${connectionStep === 'connected' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-[#A1A1AA]'}`}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">WhatsApp Connectivity</h3>
                <p className="text-sm text-[#A1A1AA]">Instance management and linking</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              connectionStep === 'connected' ? 'bg-green-100 text-green-700' : 
              connectionStep === 'pairing' ? 'bg-amber-100 text-amber-700' : 
              'bg-white/[0.06] text-[#A1A1AA]'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionStep === 'connected' ? 'bg-green-500 animate-pulse' : 
                connectionStep === 'pairing' ? 'bg-amber-500 animate-pulse' : 
                'bg-gray-400'
              }`} />
              {connectionStep === 'connected' ? 'Active' : connectionStep === 'pairing' ? 'Pairing' : 'Disconnected'}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {connectionStep === "idle" && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center text-center py-8 space-y-6"
              >
                <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-white/10">
                  <QrCode className="w-12 h-12 text-[#FAFAFA]/80" />
                </div>
                <div className="max-w-sm">
                  <h4 className="font-bold text-lg mb-2">Connect Your Account</h4>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Link your personal or business WhatsApp account to enable AIVA to respond to your messages automatically.
                  </p>
                </div>
                <button 
                  onClick={generatePairingCode}
                  disabled={isRefreshing}
                  className="bg-[#E2725B] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#D4A373] transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 cursor-pointer"
                >
                  {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Generate Link Code
                </button>
              </motion.div>
            )}

            {connectionStep === "pairing" && (
              <motion.div 
                key="pairing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col items-center text-center space-y-6"
              >
                <div className="space-y-2">
                  <h4 className="font-bold">Scan QR or Use Code</h4>
                  <p className="text-sm text-[#A1A1AA]">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
                </div>
                
                <div 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-white/10 cursor-pointer hover:shadow-md transition-all group relative"
                  onClick={simulateConnection}
                >
                  {qr ? (
                    <img src={qr} alt="WhatsApp QR" className="w-40 h-40" />
                  ) : (
                    <div className="grid grid-cols-8 grid-rows-8 gap-1 w-40 h-40 opacity-20">
                      {[...Array(64)].map((_, i) => <div key={i} className="bg-[#1A1A1A] rounded-sm" />)}
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[1px] group-hover:bg-transparent transition-all">
                    <p className="text-[10px] font-bold text-[#E2725B] uppercase mb-2">Click to pair</p>
                    <div className="text-2xl font-mono font-bold tracking-[0.3em] text-[#FAFAFA] bg-gray-50 px-4 py-2 rounded-xl border border-white/10 shadow-sm">
                      {pairingCode}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setConnectionStep("idle")} className="text-sm font-bold text-[#A1A1AA] hover:text-[#A1A1AA] cursor-pointer">
                    Cancel
                  </button>
                  <button onClick={generatePairingCode} className="text-sm font-bold text-[#E2725B] hover:underline cursor-pointer">
                    Refresh Code
                  </button>
                </div>
              </motion.div>
            )}

            {connectionStep === "connected" && (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="bg-green-50 border border-green-100 rounded-3xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 shadow-sm">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Linked Phone</p>
                      <p className="text-lg font-bold text-green-900">{phoneNumber || "+1 (555) 012-3456"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={disconnect}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all cursor-pointer"
                    title="Disconnect"
                  >
                    <Power className="w-6 h-6" />
                  </button>
                </div>

                {/* Instance Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <ShieldCheck className="w-4 h-4 text-[#E2725B]" />
                      <span className="text-sm font-bold">Encryption</span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">End-to-end encrypted connection active between AIVA and WhatsApp Servers.</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-4 h-4 text-[#E2725B]" />
                      <span className="text-sm font-bold">Last Sync</span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">Your instance was last synchronized 2 minutes ago. Latency: 42ms.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Operational Logs */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Connection Logs</h3>
            <button className="text-xs font-bold text-[#E2725B] hover:underline">Download CSV</button>
          </div>
          <div className="space-y-4">
            {[
              { event: "Instance Handshake", status: "success", time: "10:42 AM", msg: "Authentication successful via session token" },
              { event: "Message Webhook", status: "success", time: "10:45 AM", msg: "Received inbound message from +1...9023" },
              { event: "Response Sent", status: "success", time: "10:45 AM", msg: "AI response delivered via WhatsApp API" },
              { event: "Media Upload", status: "warning", time: "11:02 AM", msg: "Attachment too large, falling back to URL link" },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div className={`mt-1 w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-[#FAFAFA]">{log.event}</span>
                    <span className="text-[10px] text-[#A1A1AA]">{log.time}</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{log.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Settings2 className="w-5 h-5 text-[#E2725B]" />
            <h3 className="font-bold">Integration Settings</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-bold group-hover:text-[#E2725B] transition-colors">Show Typing Status</span>
                  <span className="text-[10px] text-[#A1A1AA]">Simulate "typing..." while thinking</span>
                </div>
                <div 
                  onClick={() => setSettings({...settings, typingIndicator: !settings.typingIndicator})}
                  className={`w-10 h-5 rounded-full transition-all relative ${settings.typingIndicator ? 'bg-[#E2725B]' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.typingIndicator ? 'left-6' : 'left-1'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-bold group-hover:text-[#E2725B] transition-colors">Mark as Read</span>
                  <span className="text-[10px] text-[#A1A1AA]">Instant double-blue ticks</span>
                </div>
                <div 
                  onClick={() => setSettings({...settings, markAsRead: !settings.markAsRead})}
                  className={`w-10 h-5 rounded-full transition-all relative ${settings.markAsRead ? 'bg-[#E2725B]' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.markAsRead ? 'left-6' : 'left-1'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-bold group-hover:text-[#E2725B] transition-colors">Contacts Only</span>
                  <span className="text-[10px] text-[#A1A1AA]">Ignore unknown numbers</span>
                </div>
                <div 
                  onClick={() => setSettings({...settings, restrictToContacts: !settings.restrictToContacts})}
                  className={`w-10 h-5 rounded-full transition-all relative ${settings.restrictToContacts ? 'bg-[#E2725B]' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.restrictToContacts ? 'left-6' : 'left-1'}`} />
                </div>
              </label>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase mb-3">Response Delay (seconds)</label>
              <input 
                type="range" 
                min="0" 
                max="10" 
                value={settings.autoReplyDelay}
                onChange={(e) => setSettings({...settings, autoReplyDelay: parseInt(e.target.value)})}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] font-bold text-[#A1A1AA]">Instant</span>
                <span className="text-xs font-bold text-[#E2725B]">{settings.autoReplyDelay}s delay</span>
                <span className="text-[10px] font-bold text-[#A1A1AA]">Slow</span>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase mb-3">Daily Message Limit</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={settings.dailyLimit}
                  onChange={(e) => setSettings({...settings, dailyLimit: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-50 border border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E2725B]"
                />
                <span className="text-xs font-bold text-[#A1A1AA]">/day</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-[#E2725B]" />
              <span className="text-sm font-bold">Pro Tip</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-4">
              Connecting via WhatsApp Business API provides higher rate limits and green-badge verification support.
            </p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10">
              Upgrade Instance
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E2725B]/15 blur-2xl -mr-16 -mt-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}
