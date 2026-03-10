"use client";

import { useState } from "react";
import { parseContactsCSV } from "@/app/lib/csv-parser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type ParsedContact = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

interface ContactImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ContactImportModal({
  open,
  onOpenChange,
  onSuccess,
}: ContactImportModalProps) {
  // CSV tab
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<ParsedContact[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState<string>("");
  const [phoneCol, setPhoneCol] = useState<string>("");
  const [emailCol, setEmailCol] = useState<string>("");

  // Quick add tab
  const [quickText, setQuickText] = useState("");
  const [quickCount, setQuickCount] = useState(0);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleCsvChange = (text: string) => {
    setCsvText(text);
    setResult(null);

    if (!text.trim()) {
      setCsvPreview([]);
      setCsvColumns([]);
      return;
    }

    // Detect columns from header row
    const firstLine = text.split(/\r?\n/)[0] || "";
    const cols = firstLine.split(",").map((h) =>
      h.trim().replace(/"/g, "")
    );
    setCsvColumns(cols);

    // Auto-detect common column mappings
    const lower = cols.map((c) => c.toLowerCase());
    const guessName =
      cols[lower.findIndex((h) => h.includes("name") || h.includes("contact"))] || "";
    const guessPhone =
      cols[
        lower.findIndex(
          (h) =>
            h.includes("phone") ||
            h.includes("mobile") ||
            h.includes("cell") ||
            h.includes("tel")
        )
      ] || "";
    const guessEmail =
      cols[lower.findIndex((h) => h.includes("email") || h.includes("mail"))] || "";

    setNameCol(guessName);
    setPhoneCol(guessPhone);
    setEmailCol(guessEmail);

    // Parse and preview first 5 rows
    const parsed = parseContactsCSV(text);
    setCsvPreview(parsed.slice(0, 5));
  };

  // Re-parse CSV with manually selected columns
  const getParsedWithMapping = (): ParsedContact[] => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const cols = headerLine.split(",").map((h) => h.trim().replace(/"/g, ""));
    const nameIdx = cols.indexOf(nameCol);
    const phoneIdx = cols.indexOf(phoneCol);
    const emailIdx = cols.indexOf(emailCol);

    const result: ParsedContact[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = lines[i].split(",").map((f) => f.trim().replace(/"/g, ""));
      const name = nameIdx >= 0 ? fields[nameIdx] : "";
      const phone = phoneIdx >= 0 ? fields[phoneIdx] : undefined;
      const email = emailIdx >= 0 ? fields[emailIdx] : undefined;
      if (!name && !phone && !email) continue;
      result.push({ name: name || "Unknown", phone, email });
    }
    return result;
  };

  const handleQuickChange = (text: string) => {
    setQuickText(text);
    setResult(null);
    const lines = text.split(/\n/).filter((l) => l.trim());
    setQuickCount(lines.length);
  };

  // Parse quick-add lines: "Name, +1767..." or just "+1767..."
  const parseQuickContacts = (): ParsedContact[] => {
    const lines = quickText.split(/\n/).filter((l) => l.trim());
    return lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        return { name: parts[0], phone: parts[1] };
      }
      // Single value — assume it's a phone number
      const phoneMatch = line.match(/\+?\d[\d\s\-]{6,}/);
      if (phoneMatch) {
        return { name: "Unknown", phone: phoneMatch[0] };
      }
      return { name: line.trim() };
    });
  };

  const doImport = async (contacts: ParsedContact[]) => {
    if (contacts.length === 0) {
      toast.error("No contacts to import");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      const data: ImportResult = await res.json();
      if (!res.ok) throw new Error((data as any).error || "Import failed");
      setResult(data);
      if (data.imported > 0) {
        toast.success(`✅ ${data.imported} imported${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`);
        onSuccess?.();
      } else if (data.skipped > 0) {
        toast.info(`All ${data.skipped} contacts already exist`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = () => {
    const contacts = nameCol ? getParsedWithMapping() : parseContactsCSV(csvText);
    doImport(contacts);
  };

  const handleImportQuick = () => {
    doImport(parseQuickContacts());
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setCsvText("");
      setCsvPreview([]);
      setCsvColumns([]);
      setQuickText("");
      setQuickCount(0);
      setResult(null);
    }
    onOpenChange(v);
  };

  const csvCount = nameCol ? getParsedWithMapping().length : parseContactsCSV(csvText).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Contacts
          </DialogTitle>
          <DialogDescription>
            Import multiple contacts at once from a CSV file or by pasting a list.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border">
              {result.imported > 0 ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {result.imported > 0
                    ? `✅ ${result.imported} contact${result.imported !== 1 ? "s" : ""} imported`
                    : "No new contacts imported"}
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {result.skipped} skipped (duplicates)
                  </p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive mb-2">
                  {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setResult(null)} className="flex-1">
                Import More
              </Button>
              <Button onClick={() => handleClose(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="csv">
            <TabsList className="w-full">
              <TabsTrigger value="csv" className="flex-1">Paste CSV</TabsTrigger>
              <TabsTrigger value="quick" className="flex-1">Quick Add</TabsTrigger>
            </TabsList>

            {/* ── CSV Tab ─────────────────────────────────────── */}
            <TabsContent value="csv" className="space-y-4 mt-4">
              <Textarea
                placeholder={`name,phone,email\nJohn Smith,+17671234567,john@example.com\nSarah Jones,+17679876543,`}
                value={csvText}
                onChange={(e) => handleCsvChange(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />

              {/* Column mapping */}
              {csvColumns.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Name column</p>
                    <Select value={nameCol} onValueChange={setNameCol}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— none —</SelectItem>
                        {csvColumns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Phone column</p>
                    <Select value={phoneCol} onValueChange={setPhoneCol}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— none —</SelectItem>
                        {csvColumns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Email column</p>
                    <Select value={emailCol} onValueChange={setEmailCol}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— none —</SelectItem>
                        {csvColumns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div className="rounded-xl border overflow-hidden">
                  <p className="text-xs font-medium px-3 py-2 bg-muted text-muted-foreground">
                    Preview (first {csvPreview.length} rows)
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Name</th>
                        <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Phone</th>
                        <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((c, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5 font-medium">{c.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{c.phone || "—"}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{c.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                disabled={loading || csvCount === 0}
                onClick={handleImportCSV}
                className="w-full"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                ) : (
                  `Import ${csvCount > 0 ? csvCount : ""} Contact${csvCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </TabsContent>

            {/* ── Quick Add Tab ────────────────────────────────── */}
            <TabsContent value="quick" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>One contact per line. Format: <code className="text-xs bg-muted px-1 py-0.5 rounded">Name, +17671234567</code></p>
                <p>Or just a phone number: <code className="text-xs bg-muted px-1 py-0.5 rounded">+17671234567</code></p>
              </div>
              <Textarea
                placeholder={`John Smith, +17671234567\nSarah Jones, +17679876543\n+17675550000`}
                value={quickText}
                onChange={(e) => handleQuickChange(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {quickCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {quickCount} line{quickCount !== 1 ? "s" : ""} detected
                </p>
              )}
              <Button
                disabled={loading || quickCount === 0}
                onClick={handleImportQuick}
                className="w-full"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                ) : (
                  `Import ${quickCount > 0 ? quickCount : ""} Contact${quickCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
