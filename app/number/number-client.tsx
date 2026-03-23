"use client";
import { useState, useEffect, useCallback } from "react";
import DarkShell from "@/app/components/dark-shell";
import { Phone, Loader2, CheckCircle, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

function MetaEmbeddedSignup({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // Load Facebook SDK
    if (document.getElementById('facebook-jssdk')) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID || '',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      });
      setSdkLoaded(true);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Don't remove SDK on unmount — it persists
    };
  }, []);

  // Listen for the embedded signup session info message event
  useEffect(() => {
    const sessionHandler = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          // data contains: { phone_number_id, waba_id, ... }
          if (data.data?.phone_number_id && data.data?.waba_id) {
            console.log('[Embedded Signup] Session info:', data.data);
            // Store for use after FB.login completes
            (window as any).__waEmbeddedData = data.data;
          }
        }
      } catch {
        // Not JSON or not our event
      }
    };
    
    window.addEventListener('message', sessionHandler);
    return () => window.removeEventListener('message', sessionHandler);
  }, []);

  const launchSignup = useCallback(() => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded yet. Please try again.');
      return;
    }

    setLoading(true);

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const code = response.authResponse.code;
          // Get the embedded signup data from the message event
          const embeddedData = (window as any).__waEmbeddedData || {};
          
          console.log('[WA Connect] FB response:', response);
          console.log('[WA Connect] Embedded data:', embeddedData);

          fetch('/api/whatsapp/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              phone_number_id: embeddedData.phone_number_id || '',
              waba_id: embeddedData.waba_id || '',
              display_phone_number: embeddedData.display_phone_number || '',
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              setLoading(false);
              if (data.success) {
                toast.success('WhatsApp Business connected!');
                onSuccess(data);
              } else {
                toast.error(data.error || 'Connection failed');
              }
            })
            .catch((err) => {
              setLoading(false);
              toast.error('Connection failed: ' + err.message);
            });
        } else {
          setLoading(false);
          toast.error('Facebook login cancelled or failed');
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID || '',
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      }
    );
  }, [onSuccess]);

  return (
    <button
      onClick={launchSignup}
      disabled={loading || !sdkLoaded}
      className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all cursor-pointer"
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      {loading ? 'Connecting...' : 'Connect WhatsApp Business'}
    </button>
  );
}

export default function NumberClient() {
  const [status, setStatus] = useState<"idle" | "loading" | "connected" | "provisioned">("loading");
  const [connectedData, setConnectedData] = useState<any>(null);
  const [phoneData, setPhoneData] = useState<any>(null);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    // Check if already connected via embedded signup
    Promise.all([
      fetch('/api/whatsapp/connect').then(r => r.json()).catch(() => ({ connected: false })),
      fetch('/api/agent').then(r => r.json()).catch(() => ({})),
    ]).then(([waData, agentData]) => {
      if (waData.connected) {
        setConnectedData(waData);
        setStatus('connected');
      } else if (agentData.agent?.phoneNumber) {
        setPhoneData({ number: agentData.agent.phoneNumber });
        setStatus('provisioned');
      } else {
        setStatus('idle');
      }
    });
  }, []);

  const handleEmbeddedSuccess = (data: any) => {
    setConnectedData(data);
    setStatus('connected');
  };

  const handleRequestNumber = async () => {
    try {
      // Just record the request - EPIC will handle manually  
      const res = await fetch('/api/agent');
      const agentData = await res.json();
      if (agentData.agent?.id) {
        await fetch('/api/agent/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'number_request',
            summary: 'Business requested a dedicated WhatsApp number from BFF',
          }),
        }).catch(() => null);
      }
      setRequestSent(true);
      toast.success('Request submitted! We\'ll be in touch within 24 hours.');
    } catch {
      toast.error('Failed to submit request');
    }
  };

  if (status === 'loading') {
    return (
      <DarkShell title="WhatsApp Number">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </DarkShell>
    );
  }

  return (
    <DarkShell title="WhatsApp Number">
      <div className="max-w-lg mx-auto space-y-8 py-8">
        
        {/* Connected State */}
        {status === 'connected' && connectedData && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">WhatsApp Connected!</h2>
            <p className="text-green-300 text-lg font-mono">
              {connectedData.display_phone_number || connectedData.phone || 'Connected'}
            </p>
            <p className="text-gray-400 text-sm">
              Your business WhatsApp number is active and receiving messages.
            </p>
          </div>
        )}

        {/* Provisioned State (legacy DID) */}
        {status === 'provisioned' && phoneData && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
            <p className="text-2xl font-bold font-mono text-white">{phoneData.number || phoneData.did}</p>
            <p className="text-xs text-gray-500">Your agent's phone number is active</p>
          </div>
        )}

        {/* Setup State */}
        {status === 'idle' && (
          <>
            {/* Section A: Connect Your Own WhatsApp Business */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Connect Your WhatsApp Business</h3>
                  <p className="text-sm text-gray-400">Recommended — use your own business number</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                Connect your existing WhatsApp Business number or create a new one through Meta. 
                Your customers will message your business directly, and your AI agent will handle the conversations.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-400">
                  <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Uses your own Meta Business account</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-400">
                  <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Your business name and number appear to customers</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-400">
                  <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Full control over your WhatsApp Business profile</span>
                </div>
              </div>

              <MetaEmbeddedSignup onSuccess={handleEmbeddedSuccess} />
              
              <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-300/80">
                  You'll need a Facebook account connected to a Meta Business account. 
                  If you don't have one, Meta will help you create it during signup.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Section B: Request a Number from BFF */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Request a Number from BFF</h3>
                  <p className="text-sm text-gray-400">We'll set up a dedicated number for you</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                Don't have a Meta Business account? No problem. We'll set up a dedicated WhatsApp number 
                for your business. Our team will configure everything for you.
              </p>

              {requestSent ? (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-300 font-medium">Request Submitted!</p>
                  <p className="text-gray-400 text-sm mt-1">We'll contact you within 24 hours to set up your number.</p>
                </div>
              ) : (
                <button
                  onClick={handleRequestNumber}
                  className="w-full px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold text-lg transition-all border border-gray-700 cursor-pointer"
                >
                  Request a Number
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </DarkShell>
  );
}
