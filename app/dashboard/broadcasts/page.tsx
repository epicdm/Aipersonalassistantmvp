"use client";

import { useState, useEffect } from "react";
import { Radio, Plus, Send, Trash2, RefreshCw, Users, Clock, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Broadcast = {
  id: string;
  name: string;
  message: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  agent?: { name: string };
};

type AgentOption = { id: string; name: string };

function statusStyle(status: string) {
  const map: Record<string, string> = {
    draft: "bg-zinc-700/50 text-zinc-400 border border-zinc-600",
    sending: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    sent: "bg-green-500/20 text-green-300 border border-green-500/30",
    failed: "bg-red-500/20 text-red-300 border border-red-500/30",
  };
  return map[status] || map.draft;
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userPlan, setUserPlan] = useState("free");

  // Form state
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [phones, setPhones] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const [bcRes, agentRes, planRes] = await Promise.all([
        fetch("/api/broadcast"),
        fetch("/api/agent"),
        fetch("/api/billing/plan"),
      ]);
      const bcData = await bcRes.json();
      const agentData = await agentRes.json();
      const planData = await planRes.json();
      setBroadcasts(bcData.broadcasts || []);
      const agentList = Array.isArray(agentData) ? agentData : [];
      setAgents(agentList);
      if (agentList.length > 0) setSelectedAgent(agentList[0].id);
      setUserPlan(planData.plan || "free");
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBroadcasts(); }, []);

  const handleCreate = async (sendNow: boolean) => {
    if (!name.trim() || !message.trim()) { toast.error("Name and message are required"); return; }
    const phoneList = phones.split("\n").map((p) => p.trim()).filter(Boolean);
    if (phoneList.length === 0) { toast.error("Add at least one recipient phone number"); return; }
    if (!selectedAgent) { toast.error("Select an agent"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, agentId: selectedAgent, phones: phoneList }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create"); return; }
      toast.success("Broadcast created!");
      setDialogOpen(false);
      setName(""); setMessage(""); setPhones("");
      await fetchBroadcasts();
      if (sendNow) await triggerSend(data.broadcast.id);
    } catch {
      toast.error("Failed to create broadcast");
    } finally {
      setCreating(false);
    }
  };

  const triggerSend = async (id: string) => {
    setSending(id);
    try {
      const res = await fetch(`/api/broadcast/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Send failed"); }
      else { toast.success(`Sent ${data.sentCount} messages${data.failedCount > 0 ? `, ${data.failedCount} failed` : ""}`); await fetchBroadcasts(); }
    } catch { toast.error("Send failed"); }
    finally { setSending(null); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/broadcast/${id}`, { method: "DELETE" });
    setBroadcasts((prev) => prev.filter((b) => b.id !== id));
    toast.success("Deleted");
  };

  return (
    <DashboardShell>
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Broadcasts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Send messages to multiple contacts at once</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchBroadcasts} disabled={loading} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {userPlan !== "free" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 transition-all cursor-pointer">
                  <Plus className="w-4 h-4" /> New Broadcast
                </span>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-zinc-100">Create Broadcast</DialogTitle>
                  <DialogDescription className="text-zinc-500">
                    Send a WhatsApp message to multiple contacts at once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-zinc-300 text-xs">Campaign Name</Label>
                    <Input placeholder="e.g. July Promotion" value={name} onChange={(e) => setName(e.target.value)}
                      className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                  </div>
                  {agents.length > 1 && (
                    <div>
                      <Label className="text-zinc-300 text-xs">Agent</Label>
                      <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                        className="mt-1 w-full text-sm border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-800 text-zinc-300">
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <Label className="text-zinc-300 text-xs">Message</Label>
                    <textarea placeholder="Type your WhatsApp message..." value={message} onChange={(e) => setMessage(e.target.value)}
                      rows={4} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                    <p className="text-[10px] text-zinc-600 mt-1">{message.length} characters</p>
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-xs">Recipients (one number per line)</Label>
                    <textarea placeholder={"14165550100\n18005551234\n..."} value={phones} onChange={(e) => setPhones(e.target.value)}
                      rows={5} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {phones.split("\n").filter((p) => p.trim()).length} numbers · {userPlan === "pro" ? "max 500" : "unlimited"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                    ⚠️ Recipients must have messaged your agent in the last 24 hours for free-form messages.
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" onClick={() => handleCreate(false)} disabled={creating} className="text-zinc-400 hover:text-zinc-200">
                    Save Draft
                  </Button>
                  <Button onClick={() => handleCreate(true)} disabled={creating}
                    className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0">
                    <Send className="w-4 h-4 mr-2" />{creating ? "Creating..." : "Create & Send"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Free plan gate */}
      {userPlan === "free" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200 mb-2">Upgrade to Send Broadcasts</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            Reach up to 500 contacts at once on Pro, or unlimited on Business.
          </p>
          <a href="/upgrade" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white transition-all">Upgrade Now →</a>
        </div>
      )}

      {/* Broadcast list */}
      {userPlan !== "free" && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
              <Radio className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No broadcasts yet — create your first one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-zinc-200 truncate">{b.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusStyle(b.status)}`}>
                          {b.status}
                        </span>
                        {b.agent && <span className="text-xs text-zinc-500">· {b.agent.name}</span>}
                      </div>
                      <p className="text-sm text-zinc-500 truncate mb-2">{b.message}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.recipientCount} recipients</span>
                        {b.status !== "draft" && <>
                          <span className="text-green-400">✓ {b.sentCount} sent</span>
                          {b.failedCount > 0 && <span className="text-red-400">✗ {b.failedCount} failed</span>}
                        </>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.status === "draft" && (
                        <Button size="sm" onClick={() => triggerSend(b.id)} disabled={sending === b.id}
                          className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">
                          {sending === b.id ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                          {sending === b.id ? "Sending..." : "Send"}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}
                        className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </DashboardShell>
  );
}