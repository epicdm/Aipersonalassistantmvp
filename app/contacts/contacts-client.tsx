"use client";

import { useState, useEffect, useRef } from "react";
import DarkShell from "@/app/components/dark-shell";
import { Users, Plus, Phone, Mail, MessageSquare, Search, X, Send, Check, Clock, Upload, BookOpen, Smartphone, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { ContactImportModal } from "@/app/components/contact-import-modal";

type Contact = { id: string; name: string; phone?: string; email?: string; notes?: string; tags?: string[]; createdAt: string };
type ConversationMessage = { id: string; direction: string; text: string; status: string; timestamp: string };
type Conversation = { id: string; contactId: string; channel: string; messages: ConversationMessage[]; status: string; contact?: Contact };

type AddMode = null | "quick" | "paste" | "csv" | "manual";

export default function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [showCompose, setShowCompose] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // Manual form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Quick add (just name + number, one line)
  const [quickInput, setQuickInput] = useState("");

  // Paste bulk
  const [pasteInput, setPasteInput] = useState("");
  const [parsedContacts, setParsedContacts] = useState<{ name: string; phone?: string; email?: string }[]>([]);

  // CSV
  const fileRef = useRef<HTMLInputElement>(null);

  // Compose
  const [composeText, setComposeText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { loadContacts(); loadConversations(); }, []);

  const loadContacts = async () => {
    try { const res = await fetch("/api/contacts"); const data = await res.json(); setContacts(data.contacts || []); } catch { toast.error("Failed to load contacts"); } finally { setLoading(false); }
  };
  const loadConversations = async () => {
    try { const res = await fetch("/api/conversations"); const data = await res.json(); setConversations(data.conversations || []); } catch {}
  };

  const addContact = async (name: string, phone?: string, email?: string, notes?: string) => {
    if (!name.trim()) return;
    if (!phone?.trim() && !email?.trim()) return;
    try {
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, email, notes }) });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setContacts((prev) => [...prev, data.contact]);
      return data.contact;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const deleteContact = async (id: string) => {
    try { await fetch("/api/contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setContacts((prev) => prev.filter((c) => c.id !== id)); toast.success("Contact removed"); } catch { toast.error("Failed to remove"); }
  };

  // Quick add: parse "John Smith +17675551234" or "John Smith john@email.com"
  const handleQuickAdd = async () => {
    const text = quickInput.trim();
    if (!text) return;

    // Try to extract phone number
    const phoneMatch = text.match(/(\+?\d[\d\s\-()]{7,})/);
    const emailMatch = text.match(/([^\s]+@[^\s]+\.[^\s]+)/);
    let name = text;
    let phone = phoneMatch?.[1]?.replace(/[\s\-()]/g, "") || "";
    let email = emailMatch?.[1] || "";

    if (phoneMatch) name = name.replace(phoneMatch[0], "").trim();
    if (emailMatch) name = name.replace(emailMatch[0], "").trim();
    // Clean trailing/leading commas, dashes
    name = name.replace(/^[\s,\-]+|[\s,\-]+$/g, "").trim();

    if (!name) { toast.error("Couldn't parse a name"); return; }
    if (!phone && !email) { toast.error("Include a phone number or email"); return; }

    const contact = await addContact(name, phone, email);
    if (contact) {
      toast.success(`Added ${contact.name}`);
      setQuickInput("");
    }
  };

  // Paste parser: handle multi-line paste
  const parsePaste = (text: string) => {
    setPasteInput(text);
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed: { name: string; phone?: string; email?: string }[] = [];

    for (const line of lines) {
      const phoneMatch = line.match(/(\+?\d[\d\s\-()]{7,})/);
      const emailMatch = line.match(/([^\s,]+@[^\s,]+\.[^\s,]+)/);
      let name = line;
      let phone = phoneMatch?.[1]?.replace(/[\s\-()]/g, "") || undefined;
      let email = emailMatch?.[1] || undefined;

      if (phoneMatch) name = name.replace(phoneMatch[0], "");
      if (emailMatch) name = name.replace(emailMatch[0], "");
      // Clean separators
      name = name.replace(/[,|\t]+/g, " ").replace(/\s+/g, " ").replace(/^[\s,\-]+|[\s,\-]+$/g, "").trim();

      if (name && (phone || email)) {
        parsed.push({ name, phone, email });
      }
    }
    setParsedContacts(parsed);
  };

  const importParsed = async () => {
    let added = 0;
    for (const c of parsedContacts) {
      const result = await addContact(c.name, c.phone, c.email);
      if (result) added++;
    }
    toast.success(`Added ${added} contact${added !== 1 ? "s" : ""}`);
    setPasteInput("");
    setParsedContacts([]);
    setAddMode(null);
  };

  // CSV handler
  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { toast.error("CSV needs a header row + data"); return; }

    const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
    const nameIdx = header.findIndex(h => h.includes("name"));
    const phoneIdx = header.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("cell") || h.includes("number"));
    const emailIdx = header.findIndex(h => h.includes("email") || h.includes("mail"));

    if (nameIdx === -1) { toast.error("CSV needs a 'name' column"); return; }

    let added = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
      const name = cols[nameIdx] || "";
      const phone = phoneIdx >= 0 ? cols[phoneIdx] : undefined;
      const email = emailIdx >= 0 ? cols[emailIdx] : undefined;
      if (name && (phone || email)) {
        const result = await addContact(name, phone, email);
        if (result) added++;
      }
    }
    toast.success(`Imported ${added} contact${added !== 1 ? "s" : ""} from CSV`);
    setAddMode(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleManualAdd = async () => {
    if (!newName.trim()) return toast.error("Name is required");
    if (!newPhone.trim() && !newEmail.trim()) return toast.error("Phone or email required");
    const contact = await addContact(newName, newPhone, newEmail, newNotes);
    if (contact) {
      toast.success(`Added ${contact.name}`);
      setAddMode(null);
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes("");
    }
  };

  const sendMessage = async () => {
    if (!showCompose || !composeText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: showCompose.id, message: composeText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.needsApproval ? "Message drafted!" : "Message sent!");
      setComposeText(""); setShowCompose(null); loadConversations();
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  };

  const approveMessage = async (conversationId: string) => {
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, action: "approve" }) });
      if (!res.ok) throw new Error("Failed"); toast.success("Message approved & sent!"); loadConversations();
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()));
  const pendingConversations = conversations.filter((conv) => conv.messages.some((m) => m.status === "pending_approval"));

  return (
    <DarkShell title="Contacts">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Who do I know?</h2>
          <p className="text-gray-500 text-sm">These are the people I can reach out to for you</p>
        </div>
      </div>

      {/* Quick add bar — always visible */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <input
              type="text"
              placeholder='Type a name + number or email — e.g. "Sarah Chen +17675551234"'
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white placeholder:text-gray-600"
            />
          </div>
          <button onClick={handleQuickAdd} disabled={!quickInput.trim()} className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-30">
            Add
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => setAddMode("paste")} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-700 transition-all cursor-pointer">
            <FileText className="w-3.5 h-3.5" /> Paste a list
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-700 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button onClick={() => setAddMode("manual")} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-700 transition-all cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Manual entry
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </div>
      </div>

      {/* Paste bulk panel */}
      <AnimatePresence>
        {addMode === "paste" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Paste your contacts</h3>
                <button onClick={() => { setAddMode(null); setPasteInput(""); setParsedContacts([]); }} className="p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <p className="text-xs text-gray-500 mb-3">One per line. Any format works — I'll figure out names, numbers, and emails.</p>
              <textarea
                placeholder={"John Smith +17675551234\nSarah Chen sarah@burton.dm\nMike Jones, mike@example.com, +1 767 555 9876"}
                value={pasteInput}
                onChange={(e) => parsePaste(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none font-mono"
              />
              {parsedContacts.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Found <span className="text-white font-bold">{parsedContacts.length}</span> contact{parsedContacts.length !== 1 ? "s" : ""}:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {parsedContacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-3 bg-gray-800/50 rounded-lg">
                        <span className="font-bold text-white">{c.name}</span>
                        {c.phone && <span className="text-gray-500">{c.phone}</span>}
                        {c.email && <span className="text-gray-500">{c.email}</span>}
                      </div>
                    ))}
                  </div>
                  <button onClick={importParsed} className="mt-3 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all cursor-pointer">
                    Import {parsedContacts.length} contact{parsedContacts.length !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual entry panel */}
      <AnimatePresence>
        {addMode === "manual" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Add contact manually</h3>
                <button onClick={() => setAddMode(null)} className="p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-500">Name *</label><input type="text" placeholder="John Smith" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" /></div>
                <div><label className="text-xs font-bold text-gray-500">Phone</label><input type="tel" placeholder="+1 767 555 0123" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" /></div>
                <div><label className="text-xs font-bold text-gray-500">Email</label><input type="email" placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" /></div>
                <div><label className="text-xs font-bold text-gray-500">Notes</label><input type="text" placeholder="VIP client, prefers WhatsApp" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" /></div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setAddMode(null)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-800 transition-all cursor-pointer">Cancel</button>
                <button onClick={handleManualAdd} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all cursor-pointer">Add Contact</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending approvals */}
      {pendingConversations.length > 0 && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><Clock className="w-4 h-4" /> Pending Approval ({pendingConversations.length})</div>
          {pendingConversations.map((conv) => {
            const pending = conv.messages.find((m) => m.status === "pending_approval");
            return (
              <div key={conv.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold">To: {conv.contact?.name || "Unknown"} <span className="text-gray-500 font-normal ml-2">via {conv.channel}</span></p>
                  <p className="text-sm text-gray-400 mt-1">"{pending?.text}"</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveMessage(conv.id)} className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 flex items-center gap-1.5 cursor-pointer"><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold hover:bg-gray-700 cursor-pointer">Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search — only show if contacts exist */}
      {contacts.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white placeholder:text-gray-600" />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-600">Loading...</div>
      ) : filtered.length === 0 && !search ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold">I don't know anyone yet</p>
          <p className="text-gray-600 text-sm mt-1 max-w-xs mx-auto">Type a name and number above, paste a list, or import a CSV — I'll take it from there</p>
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No matches for "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((contact) => (
            <div key={contact.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm">
                    {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <p className="font-bold text-sm">{contact.name}</p>
                </div>
                <button onClick={() => deleteContact(contact.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              {contact.phone && <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Phone className="w-3.5 h-3.5" />{contact.phone}</div>}
              {contact.email && <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Mail className="w-3.5 h-3.5" />{contact.email}</div>}
              {contact.notes && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{contact.notes}</p>}
              <button onClick={() => setShowCompose(contact)} className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 text-xs font-bold hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5" /> Send Message
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Message {showCompose.name}</h2>
                <p className="text-sm text-gray-500 mt-1">via {showCompose.phone ? "WhatsApp" : "Email"} · {showCompose.phone || showCompose.email}</p>
              </div>
              <button onClick={() => setShowCompose(null)} className="p-2 rounded-xl hover:bg-gray-800 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <textarea placeholder="Tell your agent what to say..." value={composeText} onChange={(e) => setComposeText(e.target.value)} rows={4} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCompose(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-800 transition-all cursor-pointer">Cancel</button>
              <button onClick={sendMessage} disabled={sending || !composeText.trim()} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                <Send className="w-4 h-4" /> {sending ? "Sending..." : "Draft Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DarkShell>
  );
}
