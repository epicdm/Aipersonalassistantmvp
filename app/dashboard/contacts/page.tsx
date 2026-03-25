"use client";

import DashboardShell from "@/app/components/dashboard-shell";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  tags: string[];
  notes?: string;
  stage?: string;
  createdAt: string;
  doNotContact: boolean;
}

export default function ContactsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/sign-in"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/contacts")
      .then(r => r.json())
      .then(data => setContacts(Array.isArray(data?.contacts) ? data.contacts : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const addContact = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Contact added");
        setContacts(prev => [data.contact, ...prev]);
        setShowAdd(false);
        setForm({ name: "", phone: "", email: "" });
      } else toast.error(data.error || "Failed");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  if (!isLoaded || !isSignedIn) return null;

  const filtered = contacts.filter(c =>
    !search || [c.name, c.phone, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const initials = (c: Contact) => (c.name || c.phone || "?").slice(0, 2).toUpperCase();

  return (
    <DashboardShell>
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <header style={{ background: "#f8f9fa", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e1e3e3", position: "sticky", top: 0, zIndex: 40 }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#00333c", margin: 0 }}>Contacts</h1>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#00333c", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 9999, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
            Add Contact
          </button>
        </header>

        <main style={{ maxWidth: 700, margin: "0 auto", padding: "20px 24px 100px" }}>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#70787b", fontSize: 20 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              style={{ width: "100%", background: "#fff", border: "1px solid #e1e3e3", borderRadius: 12, padding: "12px 14px 12px 44px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Add form */}
          {showAdd && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e1e3e3", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#00333c", marginBottom: 20 }}>New Contact</h3>
              {[
                { key: "name", label: "Name", placeholder: "Full name", required: true },
                { key: "phone", label: "Phone (WhatsApp)", placeholder: "+1 767 555 1234" },
                { key: "email", label: "Email", placeholder: "email@example.com" },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#70787b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                    {field.label}{field.required && " *"}
                  </label>
                  <input value={(form as any)[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: "100%", background: "#f2f4f4", border: "1px solid #e1e3e3", borderRadius: 10, padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", color: "#191c1d", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={addContact} disabled={saving}
                  style={{ flex: 1, background: "#00333c", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving..." : "Save Contact"}
                </button>
                <button onClick={() => setShowAdd(false)}
                  style={{ width: 48, background: "#f2f4f4", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#40484a" }}>close</span>
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e1e3e3", flex: 1, textAlign: "center" }}>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#00333c", margin: "0 0 2px" }}>{contacts.length}</p>
              <p style={{ color: "#70787b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, fontWeight: 600 }}>Total</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e1e3e3", flex: 1, textAlign: "center" }}>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#006d2f", margin: "0 0 2px" }}>{contacts.filter(c => c.phone).length}</p>
              <p style={{ color: "#70787b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, fontWeight: 600 }}>WhatsApp</p>
            </div>
          </div>

          {/* Contacts list */}
          {loading ? (
            [1,2,3,4].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: "#e1e3e3", marginBottom: 8, animation: "bff-pulse 2s infinite" }} />)
          ) : filtered.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", border: "1px solid #e1e3e3" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: "#bfc8ca", display: "block", marginBottom: 14 }}>contacts</span>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#00333c", marginBottom: 8 }}>
                {search ? "No contacts found" : "No contacts yet"}
              </h3>
              {!search && (
                <p style={{ color: "#70787b", fontSize: "0.875rem", marginBottom: 24 }}>Contacts are added automatically when customers message your agent.</p>
              )}
            </div>
          ) : (
            filtered.map(contact => (
              <div key={contact.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", marginBottom: 8, border: "1px solid #e1e3e3", display: "flex", gap: 14, alignItems: "center" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#004B57")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#e1e3e3")}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,75,87,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#004B57", fontSize: "0.9rem" }}>
                  {initials(contact)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "#00333c", margin: "0 0 2px", fontSize: "0.9rem" }}>
                    {contact.name || "Unknown"}
                  </p>
                  <p style={{ color: "#70787b", fontSize: "0.75rem", margin: 0 }}>
                    {[contact.phone, contact.email].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                </div>
                {contact.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {contact.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ background: "rgba(0,75,87,0.1)", color: "#004B57", fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px", borderRadius: 9999 }}>{tag}</span>
                    ))}
                  </div>
                )}
                {contact.phone && (
                  <a href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(93,253,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}>
                    <span className="material-symbols-outlined" style={{ color: "#006d2f", fontSize: 18, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>chat</span>
                  </a>
                )}
              </div>
            ))
          )}
        </main>

        <nav style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 16px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(191,200,202,0.15)" }}>
          {[
            { href: "/dashboard", icon: "home", label: "Home" },
            { href: "/dashboard/conversations", icon: "chat_bubble", label: "Chats" },
            { href: "/dashboard/agents", icon: "smart_toy", label: "Agents" },
            { href: "/dashboard/settings", icon: "settings_suggest", label: "Settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 20px", borderRadius: 16, textDecoration: "none", color: "#40484a" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </DashboardShell>
  );
}
