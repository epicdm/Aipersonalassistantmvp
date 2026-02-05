import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Settings, 
  Wrench, 
  MessageSquare, 
  Phone, 
  Save, 
  Check, 
  Calendar, 
  Mail, 
  BookOpen, 
  LogOut,
  Clock,
  ExternalLink,
  ChevronRight,
  CircleDot,
  Send,
  User,
  Bot as BotIcon,
  Trash2,
  FileText,
  Plus,
  LayoutDashboard,
  TrendingUp,
  Users,
  Zap,
  Activity,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Integrations } from "./integrations";
import { AgentSettings } from "./agent-settings";
import { KnowledgeBase } from "./knowledge-base";
import { WhatsAppManager } from "./whatsapp-manager";
import { ChatPreview } from "./chat-preview";
import { Overview } from "./overview";

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

const MOCK_CHART_DATA = [
  { name: 'Mon', messages: 40, active: 24 },
  { name: 'Tue', messages: 30, active: 13 },
  { name: 'Wed', messages: 20, active: 98 },
  { name: 'Thu', messages: 27, active: 39 },
  { name: 'Fri', messages: 18, active: 48 },
  { name: 'Sat', messages: 23, active: 38 },
  { name: 'Sun', messages: 34, active: 43 },
];

export function Dashboard({ session, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [agentConfig, setAgentConfig] = useState({
    name: "My Assistant",
    purpose: "Help me manage my schedule and reply to basic inquiries on WhatsApp.",
    status: "Draft",
    tools: {
      calendar: true,
      email: false,
      knowledge: true
    },
    whatsappStatus: "Disconnected",
    phoneNumber: ""
  });

  // Knowledge Base State
  const [knowledge, setKnowledge] = useState<any[]>([
    {
      id: "1",
      name: "Product_Roadmap_2026.pdf",
      type: "file",
      source: "Internal Storage",
      size: "2.4 MB",
      status: "synced",
      lastUpdated: "2026-02-01"
    },
    {
      id: "2",
      name: "https://docs.aiva.ai/faq",
      type: "url",
      source: "https://docs.aiva.ai/faq",
      status: "synced",
      lastUpdated: "2026-02-04"
    }
  ]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9e48b216/settings`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (data && !data.error) {
        setAgentConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9e48b216/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ...agentConfig, status: "Active" })
      });
      const data = await response.json();
      if (data.success) {
        setAgentConfig(prev => ({ ...prev, status: "Active" }));
        toast.success("Agent settings saved and activated!");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTool = (tool: keyof typeof agentConfig.tools) => {
    setAgentConfig(prev => ({
      ...prev,
      tools: { ...prev.tools, [tool]: !prev.tools[tool] }
    }));
  };

  const addKnowledge = () => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `document_${knowledge.length + 1}.pdf`,
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`
    };
    setKnowledge([...knowledge, newItem]);
    toast.success("Knowledge document added!");
  };

  const removeKnowledge = (id: string) => {
    setKnowledge(knowledge.filter(k => k.id !== id));
    toast.info("Document removed");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <CircleDot className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Initializing AIVA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex overflow-hidden font-sans selection:bg-indigo-100">
      {/* Sidebar - Desktop */}
      <aside 
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-gray-100 hidden lg:flex flex-col transition-all duration-300 ease-in-out relative z-30`}
      >
        <div className="h-20 px-8 flex items-center justify-between border-b border-gray-50 overflow-hidden whitespace-nowrap">
          <div className="flex items-center gap-3 font-black text-2xl text-gray-900">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
              <CircleDot className="w-6 h-6" />
            </div>
            {sidebarOpen && <span className="tracking-tighter">AIVA</span>}
          </div>
        </div>
        
        <nav className="flex-grow p-4 space-y-1.5 mt-4">
          <div className={`px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] h-8 overflow-hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Main
          </div>
          
          <button 
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>Overview</span>}
          </button>
          
          <div className={`px-4 py-2 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] h-8 overflow-hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Configure
          </div>
          
          <button 
            onClick={() => setActiveTab("agent")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === 'agent' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Settings className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>Agent Settings</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab("tools")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === 'tools' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Wrench className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>Integrations</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab("knowledge")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === 'knowledge' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <BookOpen className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>Knowledge Base</span>}
          </button>
          
          <div className={`px-4 py-2 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] h-8 overflow-hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Channels
          </div>
          
          <button 
            onClick={() => setActiveTab("whatsapp")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === 'whatsapp' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <MessageSquare className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>WhatsApp</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <BotIcon className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>Chat Preview</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-50 space-y-4">
          {sidebarOpen && (
            <div className="bg-gray-50 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usage Status</span>
                <span className="text-xs font-bold text-indigo-600">84%</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-[84%] rounded-full" />
              </div>
            </div>
          )}
          
          <button 
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all cursor-pointer`}
          >
            <LogOut className="w-5 h-5 shrink-0" /> 
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-indigo-600 transition-all z-40 hidden lg:flex"
        >
          {sidebarOpen ? <ChevronRight className="w-3 h-3 rotate-180" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden bg-gray-50/30">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-6">
            <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 w-80 group focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-200 transition-all">
              <Search className="w-4 h-4 text-gray-400 mr-2 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Global search (Ctrl+K)" 
                className="bg-transparent border-none outline-none text-sm w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2.5 bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-2xl border border-gray-100 transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white rounded-full" />
            </button>
            <button className="p-2.5 bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-2xl border border-gray-100 transition-all">
              <HelpCircle className="w-5 h-5" />
            </button>
            
            <div className="h-8 w-px bg-gray-100 mx-2" />
            
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-900 leading-tight">{session?.user?.user_metadata?.name || "Agent Owner"}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Enterprise Plan</p>
              </div>
              <button className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border-2 border-white shadow-sm ring-1 ring-gray-100 group hover:ring-indigo-200 transition-all">
                {session?.user?.email?.charAt(0).toUpperCase() || "U"}
              </button>
            </div>
          </div>
        </header>

        {/* Tab Header / Breadcrumbs */}
        <div className="bg-white px-8 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              <span>AIVA</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-indigo-600">
                {activeTab === "overview" ? "Dashboard" : activeTab.replace('-', ' ')}
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {activeTab === "overview" && "Performance Overview"}
              {activeTab === "agent" && "Agent Persona Settings"}
              {activeTab === "tools" && "Integrations & Skills"}
              {activeTab === "knowledge" && "RAG Knowledge Base"}
              {activeTab === "whatsapp" && "WhatsApp Channel"}
              {activeTab === "chat" && "Bot Sandbox Preview"}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest mr-4">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Status: {agentConfig.status}
            </div>
            
            {["agent", "tools", "knowledge", "whatsapp"].includes(activeTab) && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-100"
              >
                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sync Changes
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-grow overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-[1400px] mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <Overview key="overview" onNavigate={setActiveTab} />
              )}

              {activeTab === "agent" && (
                <motion.div key="agent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <AgentSettings 
                    config={agentConfig} 
                    onChange={(newConfig) => setAgentConfig(newConfig)}
                    isSaving={isSaving}
                  />
                </motion.div>
              )}

              {activeTab === "tools" && (
                <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Integrations />
                </motion.div>
              )}

              {activeTab === "knowledge" && (
                <motion.div key="knowledge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <KnowledgeBase 
                    items={knowledge} 
                    onUpdate={(newItems) => setKnowledge(newItems)} 
                  />
                </motion.div>
              )}

              {activeTab === "whatsapp" && (
                <motion.div key="whatsapp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <WhatsAppManager 
                    status={agentConfig.whatsappStatus} 
                    phoneNumber={agentConfig.phoneNumber}
                    onUpdate={(updates) => setAgentConfig({ ...agentConfig, ...updates })}
                  />
                </motion.div>
              )}

              {activeTab === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                  <ChatPreview 
                    agentName={agentConfig.name}
                    agentPurpose={agentConfig.purpose}
                    agentTone={(agentConfig as any).tone || "Professional"}
                    enabledTools={Object.entries(agentConfig.tools).filter(([_, v]) => v).map(([k]) => k)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
