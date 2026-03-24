"use client";
import { useState } from "react";
import DarkShell from "@/app/components/dark-shell";
import { BookOpen, Upload, File, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeClient() {
  const [docs, setDocs] = useState<{ name: string; size: string }[]>([]);

  return (
    <DarkShell title="Knowledge Base">
      <h2 className="text-2xl font-bold mb-2">Knowledge Base</h2>
      <p className="text-[#A1A1AA] text-sm mb-8">Upload documents so your agent can answer questions about your business</p>

      <div className="bg-[#111111] border-2 border-dashed border-white/[0.07] rounded-2xl p-12 text-center hover:border-gray-600 transition-all cursor-pointer">
        <Upload className="w-10 h-10 text-[#A1A1AA] mx-auto mb-4" />
        <p className="text-sm font-bold text-[#A1A1AA]">Drop files here or click to upload</p>
        <p className="text-xs text-[#A1A1AA] mt-1">PDF, TXT, DOCX up to 10MB</p>
      </div>

      {docs.length > 0 && (
        <div className="mt-6 space-y-2">
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#111111] border border-white/[0.07] rounded-xl p-3">
              <File className="w-4 h-4 text-[#A1A1AA]" />
              <div className="flex-1"><p className="text-sm font-bold">{doc.name}</p><p className="text-[10px] text-[#A1A1AA]">{doc.size}</p></div>
              <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#A1A1AA] hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <div className="mt-8 text-center">
          <BookOpen className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-[#A1A1AA]">No documents uploaded yet</p>
        </div>
      )}
    </DarkShell>
  );
}
