"use client";

import { useState } from "react";

type Agent = {
  name: string;
  purpose: string | null;
  tools: string[];
  whatsappStatus: string;
  phoneNumber: string | null;
  phoneStatus: string;
};

const TOOL_OPTIONS = ["Email", "Calendar", "Knowledge Base", "CRM", "Billing"];

export default function AgentForm({ agent }: { agent: Agent }) {
  const [name, setName] = useState(agent.name);
  const [purpose, setPurpose] = useState(agent.purpose || "");
  const [tools, setTools] = useState<string[]>(agent.tools || []);
  const [whatsappStatus, setWhatsappStatus] = useState(agent.whatsappStatus);
  const [phoneNumber, setPhoneNumber] = useState(agent.phoneNumber || "");
  const [phoneStatus, setPhoneStatus] = useState(agent.phoneStatus);
  const [saved, setSaved] = useState(false);

  const toggleTool = (tool: string) => {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const save = async () => {
    setSaved(false);
    await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        purpose,
        tools,
        whatsappStatus,
        phoneNumber: phoneNumber || null,
        phoneStatus,
      }),
    });
    setSaved(true);
  };

  return (
    <div className="space-y-8 rounded-lg border border-white/10 p-6">
      <div>
        <label className="text-sm text-white/70">Agent name</label>
        <input
          className="mt-2 w-full rounded border border-white/20 bg-black px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm text-white/70">Purpose</label>
        <textarea
          className="mt-2 w-full rounded border border-white/20 bg-black px-3 py-2 text-sm"
          rows={3}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm text-white/70">Tools</label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {TOOL_OPTIONS.map((tool) => (
            <label key={tool} className="flex items-center gap-3 rounded border border-white/10 p-3 text-sm">
              <input
                type="checkbox"
                checked={tools.includes(tool)}
                onChange={() => toggleTool(tool)}
              />
              {tool}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="text-sm text-white/70">WhatsApp</label>
          <div className="mt-2 flex items-center justify-between rounded border border-white/10 p-3">
            <span className="text-sm">Status: {whatsappStatus}</span>
            <button
              type="button"
              onClick={() => setWhatsappStatus("pending")}
              className="rounded bg-white px-3 py-1 text-xs font-semibold text-black"
            >
              Connect
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-white/70">Phone Number</label>
          <input
            className="mt-2 w-full rounded border border-white/20 bg-black px-3 py-2 text-sm"
            placeholder="+1 767 ..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="mt-2 text-xs text-white/60">Status: {phoneStatus}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          className="rounded bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Save settings
        </button>
        {saved && <span className="text-sm text-green-400">Saved</span>}
      </div>
    </div>
  );
}
