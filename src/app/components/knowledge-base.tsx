import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  FileText, 
  Globe, 
  Type, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mic,
  Square,
  Play
} from "lucide-react";
import { toast } from "sonner";

interface KnowledgeItem {
  id: string;
  name: string;
  type: "file" | "url" | "text" | "voice";
  source: string;
  size?: string;
  content?: string;
  status: "synced" | "indexing" | "transcribing" | "error";
  lastUpdated: string;
}

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
  onUpdate: (items: KnowledgeItem[]) => void;
}

export function KnowledgeBase({ items, onUpdate }: KnowledgeBaseProps) {
  const [activeView, setActiveView] = useState<"all" | "files" | "links" | "text" | "voice">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeView === "all" || 
                         (activeView === "files" && item.type === "file") ||
                         (activeView === "links" && item.type === "url") ||
                         (activeView === "text" && item.type === "text") ||
                         (activeView === "voice" && item.type === "voice");
      return matchesSearch && matchesType;
    });
  }, [items, searchQuery, activeView]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordTime(0);
    const interval = setInterval(() => {
      setRecordTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
    toast.info("Recording started. Speak clearly.");
  };

  const stopRecording = () => {
    clearInterval(timerInterval);
    setIsRecording(false);
    addItem("voice", `Voice_Training_${new Date().toLocaleTimeString()}.mp3`);
    setIsAddingSource(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addItem = (type: "file" | "url" | "text" | "voice", customName?: string) => {
    const name = customName || (type === "file" ? "Company_Handbook.pdf" : 
                 type === "url" ? "https://help.acme.com" : 
                 "Custom Instruction Block");
    
    const newItem: KnowledgeItem = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type,
      source: type === "url" ? name : type === "voice" ? "Recorded Audio" : "Internal Storage",
      size: type === "file" ? "1.2 MB" : type === "voice" ? "0.8 MB" : undefined,
      status: type === "voice" ? "transcribing" : "indexing",
      lastUpdated: new Date().toLocaleDateString()
    };

    onUpdate([newItem, ...items]);
    
    if (type === "voice") {
      toast.info("Voice recording captured. Transcribing...");
      
      // Stage 1: Transcribing
      setTimeout(() => {
        onUpdate(prev => prev.map(item => 
          item.id === newItem.id ? { 
            ...item, 
            status: "indexing",
            content: "The user has instructed that all customer inquiries regarding 'Project Alpha' should be redirected to the technical lead, Sarah, while general billing questions remain with the finance team."
          } : item
        ));
        toast.info("Transcription complete. Indexing data...");
        
        // Stage 2: Indexing
        setTimeout(() => {
          onUpdate(prev => prev.map(item => 
            item.id === newItem.id ? { ...item, status: "synced" } : item
          ));
          toast.success("Voice knowledge fully indexed!");
        }, 3000);
      }, 4000);
    } else {
      toast.success(`Started indexing new ${type} source`);
      setTimeout(() => {
        onUpdate(prev => prev.map(item => 
          item.id === newItem.id ? { ...item, status: "synced" } : item
        ));
        toast.success(`${type === "file" ? "Document" : "Source"} fully indexed!`);
      }, 4000);
    }
  };

  const removeItem = (id: string) => {
    onUpdate(items.filter(item => item.id !== id));
    toast.info("Source removed from knowledge base");
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search documents and links..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-1 flex">
            {[
              { id: "all", label: "All" },
              { id: "files", label: "Files" },
              { id: "links", label: "Links" },
              { id: "text", label: "Text" },
              { id: "voice", label: "Voice" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setIsAddingSource(true)}
            className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Source Modal/Overlay Mock */}
      {isAddingSource && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-indigo-900">Add New Knowledge Source</h4>
            <button onClick={() => setIsAddingSource(false)} className="text-indigo-400 hover:text-indigo-600 cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => { addItem("file"); setIsAddingSource(false); }}
              className="bg-white p-5 rounded-2xl border border-indigo-200 hover:border-indigo-400 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Upload Documents</p>
              <p className="text-[11px] text-gray-500 mt-1">PDF, TXT, DOCX up to 50MB</p>
            </button>
            
            <button 
              onClick={() => { addItem("url"); setIsAddingSource(false); }}
              className="bg-white p-5 rounded-2xl border border-indigo-200 hover:border-indigo-400 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Crawl Website</p>
              <p className="text-[11px] text-gray-500 mt-1">Import help docs or blogs</p>
            </button>
            
            <button 
              onClick={() => { addItem("text"); setIsAddingSource(false); }}
              className="bg-white p-5 rounded-2xl border border-indigo-200 hover:border-indigo-400 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Type className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm">Manual Snippet</p>
              <p className="text-[11px] text-gray-500 mt-1">Paste custom text data</p>
            </button>

            <div className="bg-white p-5 rounded-2xl border border-indigo-200 transition-all text-left relative overflow-hidden">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="w-full h-full text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Mic className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-sm">Train by Voice</p>
                  <p className="text-[11px] text-gray-500 mt-1">Record a voice note for training</p>
                </button>
              ) : (
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-red-600">{formatTime(recordTime)}</span>
                  </div>
                  <button 
                    onClick={stopRecording}
                    className="w-full py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Square className="w-3 h-3" /> Stop & Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900">No sources found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              {searchQuery ? "Try searching for something else or clear the filters." : "Add your first knowledge source to give your agent context."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setIsAddingSource(true)}
                className="mt-6 text-indigo-600 font-bold text-sm hover:underline cursor-pointer"
              >
                + Add Source
              </button>
            )}
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:border-indigo-100 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  item.type === 'file' ? 'bg-blue-50 text-blue-600' :
                  item.type === 'url' ? 'bg-green-50 text-green-600' :
                  item.type === 'voice' ? 'bg-red-50 text-red-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {item.type === 'file' && <FileText className="w-6 h-6" />}
                  {item.type === 'url' && <Globe className="w-6 h-6" />}
                  {item.type === 'text' && <Type className="w-6 h-6" />}
                  {item.type === 'voice' && <Mic className="w-6 h-6" />}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                    {item.status === 'synced' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : item.status === 'indexing' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                    ) : item.status === 'transcribing' ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 rounded-full shrink-0">
                        <RefreshCw className="w-2.5 h-2.5 text-indigo-600 animate-spin" />
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">Transcribing</span>
                      </div>
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.type}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="text-xs text-gray-500 truncate">{item.source}</span>
                    {item.size && (
                      <>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-xs text-gray-500">{item.size}</span>
                      </>
                    )}
                  </div>
                  {item.content && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[11px] text-gray-600 leading-relaxed italic line-clamp-2">
                        "{item.content}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Help */}
      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
        <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h5 className="text-sm font-bold text-gray-900 mb-1">How it works</h5>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your agent uses RAG (Retrieval-Augmented Generation) to search across these sources before answering. 
            Indexed content is securely stored and refreshed every 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

// Re-using icon from main app
function BookOpen(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function Info(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
