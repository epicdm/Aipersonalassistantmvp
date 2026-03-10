/**
 * parseContactsCSV
 * Parses a CSV string into an array of contact objects.
 * - Detects header row automatically (name/phone/email/notes columns, case-insensitive)
 * - Handles common header aliases: "full name", "mobile", "cell", "telephone", "contact"
 * - Strips surrounding quotes, trims whitespace
 * - Skips empty rows
 */
export function parseContactsCSV(text: string): {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Parse a single CSV line respecting quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headerCols = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/"/g, "").trim());

  // Find column indices by alias matching
  const findCol = (aliases: string[]): number => {
    for (const alias of aliases) {
      const idx = headerCols.findIndex((h) => h === alias || h.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findCol(["name", "full name", "fullname", "contact", "contact name"]);
  const phoneIdx = findCol(["phone", "mobile", "cell", "telephone", "tel", "number", "phone number", "mobile number"]);
  const emailIdx = findCol(["email", "e-mail", "mail", "email address"]);
  const notesIdx = findCol(["notes", "note", "description", "comment", "comments", "memo"]);

  // If no recognizable header, bail
  if (nameIdx === -1 && phoneIdx === -1) return [];

  const contacts: { name: string; phone?: string; email?: string; notes?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);

    const name = nameIdx >= 0 ? (cols[nameIdx] || "").replace(/"/g, "").trim() : "";
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] || "").replace(/"/g, "").trim() : undefined;
    const email = emailIdx >= 0 ? (cols[emailIdx] || "").replace(/"/g, "").trim() : undefined;
    const notes = notesIdx >= 0 ? (cols[notesIdx] || "").replace(/"/g, "").trim() : undefined;

    // Skip rows with no useful data
    if (!name && !phone && !email) continue;

    contacts.push({
      name: name || "Unknown",
      phone: phone || undefined,
      email: email || undefined,
      notes: notes || undefined,
    });
  }

  return contacts;
}
