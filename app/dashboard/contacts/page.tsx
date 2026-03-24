"use client";
import DashboardShell from "@/app/components/dashboard-shell";

import { useEffect, useState } from "react";
import { Users, Search, Plus, Upload, Phone, Mail, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactImportModal } from "@/app/components/contact-import-modal";

type Contact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: string;
  createdAt: string;
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const GRADIENT_PAIRS = [
  "from-[#E2725B] to-[#D4A373]",
  "from-[#D4A373] to-[#E2725B]",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : (data.contacts || []));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, []);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell>
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Contacts</h1>
          <p className="text-sm text-[#A1A1AA] mt-0.5">{contacts.length} contacts total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(true)}
            className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] border border-white/10">
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button className="bg-gradient-to-r from-[#E2725B] to-[#D4A373] hover:from-[#F48B76] hover:to-[#D4A373] text-white border-0 shadow-lg shadow-[#E2725B]/20">
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
        <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#111111] border-white/[0.07] text-[#FAFAFA] placeholder:text-white/30 focus-visible:ring-[#E2725B]/50" />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[#111111] border border-white/[0.07] rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111111] border border-white/[0.07] border-dashed rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#A1A1AA]">
            {search ? "No contacts match your search" : "No contacts yet"}
          </p>
          {!search && (
            <p className="text-xs text-white/30 mt-1 mb-5">Import from CSV or add contacts manually</p>
          )}
          {!search && (
            <Button variant="ghost" onClick={() => setImportOpen(true)}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] border border-white/10">
              <Upload className="w-4 h-4 mr-2" /> Import CSV
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact, i) => {
            const tags = (() => { try { return JSON.parse(contact.tags); } catch { return []; } })();
            return (
              <div key={contact.id} className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {getInitials(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#FAFAFA]">{contact.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {contact.phone && (
                      <span className="flex items-center gap-1 text-xs text-[#A1A1AA]">
                        <Phone className="w-3 h-3" />{contact.phone}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1 text-xs text-[#A1A1AA]">
                        <Mail className="w-3 h-3" />{contact.email}
                      </span>
                    )}
                  </div>
                </div>
                {tags.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#E2725B]/10 text-[#E2725B] border border-[#E2725B]/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ContactImportModal open={importOpen} onOpenChange={setImportOpen} onSuccess={fetchContacts} />
    </div>
    </DashboardShell>
  );
}