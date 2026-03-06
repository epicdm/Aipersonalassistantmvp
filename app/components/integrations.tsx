import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Mail, 
  BookOpen, 
  Check, 
  ExternalLink, 
  Plus, 
  Settings2, 
  Database, 
  MessageSquare, 
  Zap, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  Globe,
  Loader2,
  Search
} from "lucide-react";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: "productivity" | "communication" | "storage" | "automation";
  icon: any;
  status: "connected" | "disconnected" | "error";
  hasSettings: boolean;
  isBeta?: boolean;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Sync events, check availability and auto-schedule meetings.",
    category: "productivity",
    icon: Calendar,
    status: "connected",
    hasSettings: true
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Read, summarize and draft email replies automatically.",
    category: "communication",
    icon: Mail,
    status: "disconnected",
    hasSettings: true
  },
  {
    id: "notion",
    name: "Notion",
    description: "Index your Notion pages and databases as a knowledge base.",
    category: "storage",
    icon: BookOpen,
    status: "disconnected",
    hasSettings: true
  },
  {
    id: "slack",
    name: "Slack",
    description: "Deploy your agent to Slack channels and direct messages.",
    category: "communication",
    icon: MessageSquare,
    status: "disconnected",
    hasSettings: false,
    isBeta: true
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts and log agent interactions directly to CRM.",
    category: "automation",
    icon: Database,
    status: "error",
    hasSettings: true
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Trigger 5000+ app workflows via agent actions.",
    category: "automation",
    icon: Zap,
    status: "disconnected",
    hasSettings: false
  }
];

export function Integrations() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<Integration | null>(null);

  const filteredIntegrations = INTEGRATIONS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.category === filter;
    return matchesSearch && matchesFilter;
  });

  const handleConnect = (id: string) => {
    setConnecting(id);
    // Simulate connection flow
    setTimeout(() => {
      setConnecting(null);
      toast.success("Connection successful!");
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search tools, apps, workflows..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {["all", "productivity", "communication", "storage", "automation"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                filter === f ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((item) => (
          <motion.div 
            layout
            key={item.id}
            className="group relative bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* Status Badge */}
            <div className="absolute top-6 right-6">
              {item.status === "connected" && (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  CONNECTED
                </span>
              )}
              {item.status === "error" && (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3" />
                  RECONNECT
                </span>
              )}
            </div>

            <div className="flex flex-col h-full">
              <div className="mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${
                  item.status === 'connected' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
                }`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  {item.name}
                  {item.isBeta && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black tracking-tighter uppercase">Beta</span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-50">
                {item.status === "connected" ? (
                  <>
                    <button 
                      onClick={() => setShowConfig(item)}
                      className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4" />
                      Configure
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                      <Lock className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleConnect(item.id)}
                    disabled={connecting === item.id}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {connecting === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Connect
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Integration Modal Overlay */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfig(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <showConfig.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{showConfig.name} Settings</h2>
                    <p className="text-sm text-gray-500">Manage how AIVA interacts with your {showConfig.name} data.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      <div className="text-sm font-semibold">Active Syncing</div>
                    </div>
                    <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Permissions</label>
                    {["Read Data", "Write Access", "Background Updates"].map((perm, i) => (
                      <div key={i} className="flex items-center gap-3 px-1">
                        <div className="w-5 h-5 rounded border border-gray-200 bg-indigo-50 flex items-center justify-center">
                          <Check className="w-3 h-3 text-indigo-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{perm}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button 
                      onClick={() => setShowConfig(null)}
                      className="flex-grow bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      Save Settings
                    </button>
                    <button 
                      className="px-6 py-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all cursor-pointer"
                      onClick={() => {
                        toast.error(`${showConfig.name} disconnected`);
                        setShowConfig(null);
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Section */}
      <div className="bg-gray-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
            <Globe className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">Missing an integration?</h3>
            <p className="text-gray-400 text-sm">We're constantly adding new tools. Let us know what you need.</p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-indigo-50 transition-all whitespace-nowrap cursor-pointer">
          Request a Tool
        </button>
      </div>
    </div>
  );
}
