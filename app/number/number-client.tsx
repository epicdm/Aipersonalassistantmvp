"use client";
import { useState, useEffect } from "react";
import DarkShell from "@/app/components/dark-shell";
import { Phone, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function NumberClient() {
  const [status, setStatus] = useState<"idle" | "loading" | "provisioned">("idle");
  const [phoneData, setPhoneData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/agent").then(r => r.json()).then(d => {
      if (d.agent?.phoneNumber) { setPhoneData({ number: d.agent.phoneNumber }); setStatus("provisioned"); }
    });
  }, []);

  const provision = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/number/provision", { method: "POST" });
      const data = await res.json();
      if (data.did) { setPhoneData(data); setStatus("provisioned"); toast.success(`Number provisioned: ${data.did}`); }
      else throw new Error(data.error || "Failed");
    } catch (e: any) { toast.error(e.message); setStatus("idle"); }
  };

  return (
    <DarkShell title="Phone Number">
      <div className="max-w-md mx-auto text-center space-y-6 py-10">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl mx-auto flex items-center justify-center">
          <Phone className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold">Phone Number</h2>
        <p className="text-gray-500 text-sm">Give your agent a real phone number so people can call and text them directly.</p>

        {status === "idle" && (
          <button onClick={provision} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all cursor-pointer">
            Get a Phone Number
          </button>
        )}

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Provisioning...</div>
        )}

        {status === "provisioned" && phoneData && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
            <p className="text-2xl font-bold font-mono">{phoneData.number || phoneData.did}</p>
            <p className="text-xs text-gray-500">Your agent's phone number is active</p>
          </div>
        )}
      </div>
    </DarkShell>
  );
}
