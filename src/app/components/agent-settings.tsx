import React, { useState } from "react";
import { 
  User, 
  Target, 
  Phone, 
  Globe, 
  Volume2, 
  Clock, 
  Shield, 
  AlertTriangle,
  Check,
  ChevronDown,
  Info,
  RefreshCw,
  Sparkles,
  Briefcase,
  Headset,
  Zap
} from "lucide-react";
import { toast } from "sonner";

const AGENT_TEMPLATES = [
  {
    id: "exec",
    name: "Executive Assistant",
    role: "Senior EA",
    purpose: "You are a senior executive assistant. Your goal is to manage the user's schedule, summarize complex email threads into 3-point bullet lists, and coordinate meeting times across timezones. Maintain a professional, concise, and proactive tone. Never share sensitive meeting details with unauthorized contacts.",
    tone: "Professional",
    icon: Briefcase,
    color: "bg-blue-50 text-blue-600"
  },
  {
    id: "support",
    name: "Customer Success",
    role: "Support Hero",
    purpose: "You are an empathetic customer success agent. Help users solve technical issues, guide them through product features, and maintain a high satisfaction score. Be patient, use clear language, and always offer a 'next step' for the user. Escalate billing issues immediately.",
    tone: "Friendly",
    icon: Headset,
    color: "bg-green-50 text-green-600"
  },
  {
    id: "coach",
    name: "Productivity Coach",
    role: "Life Architect",
    purpose: "You are a motivational productivity coach. Your job is to help the user stay accountable to their goals. Check in on their daily habits, provide encouragement, and offer science-backed productivity tips. Be enthusiastic but firm on deadlines. Focus on growth mindset and small wins.",
    tone: "Enthusiastic",
    icon: Zap,
    color: "bg-amber-50 text-amber-600"
  },
  {
    id: "recruiter",
    name: "Talent Scout",
    role: "Headhunter",
    purpose: "You are a sharp technical recruiter. Screen incoming LinkedIn messages, identify top-tier engineering talent based on keywords, and schedule screening calls. Be direct, efficient, and represent the brand with high energy. Focus on cultural fit and technical depth.",
    tone: "Professional",
    icon: Target,
    color: "bg-purple-50 text-purple-600"
  }
];

interface AgentSettingsProps {
  config: any;
  onChange: (newConfig: any) => void;
  isSaving: boolean;
}

const TONES = ["Professional", "Friendly", "Casual", "Enthusiastic", "Empathetic"];
const LANGUAGES = ["English (US)", "English (UK)", "Spanish", "French", "German", "Portuguese"];

export function AgentSettings({ config, onChange, isSaving }: AgentSettingsProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!localConfig.name?.trim()) newErrors.name = "Agent name is required";
    if (localConfig.name?.length > 32) newErrors.name = "Name must be under 32 characters";
    if (!localConfig.purpose?.trim()) newErrors.purpose = "A purpose statement helps the AI perform better";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const applyTemplate = (template: typeof AGENT_TEMPLATES[0]) => {
    const newConfig = {
      ...localConfig,
      name: template.name,
      role: template.role,
      purpose: template.purpose,
      tone: template.tone
    };
    setLocalConfig(newConfig);
    onChange(newConfig);
    toast.success(`Applied ${template.name} template!`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 0. Persona Templates */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900">Quick Start Templates</h3>
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Select to pre-fill</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left group cursor-pointer"
            >
              <div className={`w-10 h-10 ${template.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <template.icon className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">{template.name}</h4>
              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                {template.purpose}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 1. Identity & Purpose */}
      <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Identity & Purpose</h3>
            <p className="text-sm text-gray-500">Define how your agent identifies and its primary mission.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              Agent Name
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            </label>
            <input 
              type="text" 
              placeholder="e.g. Alex"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
              value={localConfig.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Display Role</label>
            <input 
              type="text" 
              placeholder="e.g. Executive Assistant"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={localConfig.role || ""}
              onChange={(e) => handleInputChange("role", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center justify-between">
            Master Instructions
            <span className="text-[10px] text-gray-400 font-mono">{localConfig.purpose?.length || 0}/1000</span>
          </label>
          <textarea 
            rows={5}
            placeholder="Tell your agent exactly what to do and how to handle tricky situations..."
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all ${errors.purpose ? 'border-red-300' : 'border-gray-200'}`}
            value={localConfig.purpose}
            onChange={(e) => handleInputChange("purpose", e.target.value)}
          />
          {errors.purpose && <p className="text-xs text-red-500 font-medium">{errors.purpose}</p>}
          <p className="text-[11px] text-gray-400 italic">Pro tip: Mention specific constraints like "never give legal advice".</p>
        </div>
      </section>

      {/* 2. Persona & Voice */}
      <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Persona & Voice</h3>
            <p className="text-sm text-gray-500">Fine-tune the personality and communication style.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700">Communication Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(tone => (
                <button
                  key={tone}
                  onClick={() => handleInputChange("tone", tone)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    (localConfig.tone || "Professional") === tone 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700">Primary Language</label>
            <div className="relative">
              <select 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all"
                value={localConfig.language || "English (US)"}
                onChange={(e) => handleInputChange("language", e.target.value)}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Operational Rules */}
      <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Security & Operations</h3>
            <p className="text-sm text-gray-500">Control safety guards and availability windows.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Shield className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Strict Safety Filtering</p>
                <p className="text-xs text-gray-500">Auto-reject inappropriate or risky prompts.</p>
              </div>
            </div>
            <button 
              onClick={() => handleInputChange("safetyFilter", !localConfig.safetyFilter)}
              className={`w-12 h-6 rounded-full transition-all relative ${localConfig.safetyFilter !== false ? 'bg-indigo-600' : 'bg-gray-200'} cursor-pointer`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localConfig.safetyFilter !== false ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Office Hours Response</p>
                <p className="text-xs text-gray-500">Only reply during your set business hours.</p>
              </div>
            </div>
            <button 
              onClick={() => handleInputChange("officeHours", !localConfig.officeHours)}
              className={`w-12 h-6 rounded-full transition-all relative ${localConfig.officeHours ? 'bg-indigo-600' : 'bg-gray-200'} cursor-pointer`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localConfig.officeHours ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Danger Zone */}
      <section className="bg-red-50/50 rounded-3xl p-8 border border-red-100 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900">Danger Zone</h3>
            <p className="text-sm text-red-700/70">Critical actions that cannot be undone.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-red-100 shadow-sm">
          <div>
            <p className="text-sm font-bold text-gray-900">Reset Agent Memory</p>
            <p className="text-xs text-gray-500">Clear all past conversation history for this agent.</p>
          </div>
          <button className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all cursor-pointer">
            Reset Memory
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-red-100 shadow-sm">
          <div>
            <p className="text-sm font-bold text-gray-900">Deactivate Agent</p>
            <p className="text-xs text-gray-500">This will immediately disconnect all active integrations.</p>
          </div>
          <button className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md shadow-red-100 cursor-pointer">
            Deactivate
          </button>
        </div>
      </section>

      {/* Floating Status Notification */}
      {JSON.stringify(config) !== JSON.stringify(localConfig) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">You have unsaved changes</span>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex gap-3">
            <button 
              onClick={() => setLocalConfig(config)}
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button 
              onClick={() => toast.info("Please use the Save button at the top right")}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
