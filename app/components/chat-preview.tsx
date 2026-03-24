import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Trash2, 
  Zap, 
  ShieldCheck, 
  Wrench,
  RefreshCw,
  Terminal,
  Clock,
  ChevronRight,
  Smile,
  Paperclip,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "bot" | "system";
  text: string;
  timestamp: Date;
  thought?: string;
  tools?: string[];
}

interface ChatPreviewProps {
  agentName: string;
  agentPurpose: string;
  agentTone: string;
  enabledTools: string[];
}

const SUGGESTED_PROMPTS = [
  "What is your primary mission?",
  "Check my calendar for tomorrow.",
  "Search the knowledge base for 'Alpha'.",
  "Draft a friendly reply to my last email."
];

export function ChatPreview({ agentName, agentPurpose, agentTone, enabledTools }: ChatPreviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: "user",
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      setIsTyping(false);

      const botMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: "bot",
        text: data.reply || "I couldn't process that. Please try again.",
        thought: data.usage?.tier === "free"
          ? `Free tier · ${data.usage.messagesRemaining} messages remaining today`
          : undefined,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);

      if (data.error === "daily_limit_reached") {
        toast.error("Daily message limit reached. Upgrade to Pro for unlimited.");
      }
    } catch (err) {
      setIsTyping(false);
      const errorMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: "bot",
        text: "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.info("Conversation cleared");
  };

  return (
    <div className="flex h-[calc(100vh-180px)] gap-6 max-w-6xl mx-auto">
      {/* Main Chat Interface */}
      <div className="flex-grow flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-[#E2725B] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Bot className="w-6 h-6" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#FAFAFA]">{agentName}</h4>
              <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest">{agentTone} Persona</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className={`p-2 rounded-xl transition-all ${showLogs ? 'bg-[#E2725B]/10 text-[#E2725B]' : 'text-[#A1A1AA] hover:bg-white/[0.06]'}`}
              title="Toggle Reasoning Logs"
            >
              <Terminal className="w-5 h-5" />
            </button>
            <button 
              onClick={clearChat}
              className="p-2 text-[#A1A1AA] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#A1A1AA] hover:bg-white/[0.06] rounded-xl transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-grow p-6 overflow-y-auto space-y-6 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 bg-[#E2725B]/10 rounded-3xl flex items-center justify-center text-[#E2725B] mb-2">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#FAFAFA]">Sandbox Preview</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Test your agent's personality and tool access in real-time. This chat doesn't affect your production data.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1.5 bg-white border border-white/10 rounded-xl text-xs font-medium text-[#A1A1AA] hover:border-[#E2725B] hover:text-[#E2725B] transition-all cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'system' ? (
                  <div className="w-full flex justify-center">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full">
                      <RefreshCw className="w-3 h-3 text-[#A1A1AA] animate-spin" />
                      <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{msg.text}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-1 ${
                      msg.role === 'user' ? 'bg-[#E2725B]/15 text-[#E2725B]' : 'bg-white/[0.06] text-[#A1A1AA]'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className="space-y-2">
                      <div className={`p-4 rounded-3xl shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-[#E2725B] text-white rounded-tr-none shadow-indigo-100' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                      
                      {msg.tools && msg.tools.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.tools.map(tool => (
                            <div key={tool} className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-lg">
                              <Wrench className="w-2.5 h-2.5 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-700 uppercase">{tool} used</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {showLogs && msg.thought && (
                        <div className="p-3 bg-[#111111]/5 rounded-2xl border border-dashed border-white/10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Zap className="w-3 h-3 text-[#E2725B]" />
                            <span className="text-[10px] font-bold text-[#E2725B] uppercase">Reasoning Process</span>
                          </div>
                          <p className="text-[11px] text-[#A1A1AA] italic leading-relaxed">
                            {msg.thought}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex justify-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#A1A1AA]" />
              </div>
              <div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-tl-none flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#E2725B] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#E2725B] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-[#E2725B] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
            className="flex items-center gap-3 bg-gray-50 border border-white/10 rounded-2xl p-2 pr-3 focus-within:ring-2 focus-within:ring-[#E2725B] focus-within:border-transparent transition-all"
          >
            <button type="button" className="p-2 text-[#A1A1AA] hover:text-[#E2725B] rounded-xl transition-all">
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              placeholder="Send a test message..."
              className="flex-grow bg-transparent border-none outline-none text-sm py-2 px-1"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="button" className="p-2 text-[#A1A1AA] hover:text-[#E2725B] rounded-xl transition-all">
              <Smile className="w-5 h-5" />
            </button>
            <button 
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="bg-[#E2725B] text-white p-2.5 rounded-xl hover:bg-[#D4A373] disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-3 flex items-center justify-center gap-6">
             <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA]">
               <ShieldCheck className="w-3 h-3" />
               <span>Sandbox Environment</span>
             </div>
             <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA]">
               <Clock className="w-3 h-3" />
               <span>Latency: 1.2s</span>
             </div>
          </div>
        </div>
      </div>

      {/* Settings Sidebar (Mini) */}
      <div className="hidden xl:flex w-72 flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-[#FAFAFA]">Active Context</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-2">Enabled Tools</p>
              <div className="flex flex-wrap gap-2">
                {enabledTools.length > 0 ? (
                  enabledTools.map(tool => (
                    <div key={tool} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold uppercase border border-green-100">
                      {tool}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#A1A1AA] italic">No tools enabled</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-2">Persona Configuration</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#A1A1AA]">Name</span>
                  <span className="font-bold">{agentName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#A1A1AA]">Tone</span>
                  <span className="font-bold">{agentTone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl p-6 text-white relative overflow-hidden flex-grow">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#E2725B]" />
              <span className="text-sm font-bold">AIVA Reasoning</span>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed">
              Every response is generated based on your Master Instructions and RAG memory system. Use the reasoning logs to debug how your agent thinks.
            </p>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#E2725B]/15 blur-2xl -mr-16 -mb-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}
