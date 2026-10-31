/** Pure text → segment parsing (Markdown / plain text paragraphs, CSV rows). No I/O. */
import Papa from "papaparse";
import type { ParsedSegment } from "@/lib/ai/types";

export function parseParagraphs(text: string, prefix = "¶"): ParsedSegment[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    // drop headings-only blocks and the "Illustrative" disclaimer blockquote
    .filter((p) => p.length > 0 && !/^#+\s/.test(p) && !/^>/.test(p))
    .map((p, i) => ({ text: p, location: `${prefix}${i + 1}` }));
}

export function parseCsv(text: string): ParsedSegment[] {
  const out = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  return out.data.map((row, i) => ({
    // "Function: Supply chain; Metric: Customer fill rate; … Comment: …" — one row = one segment (§7.2)
    text: Object.entries(row)
      .filter(([, v]) => v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${String(v).trim()}`)
      .join("; ")
      .concat("."),
    location: `Row ${i + 2}`,
  }));
}

export function parseText(fileName: string, text: string): ParsedSegment[] {
  return fileName.toLowerCase().endsWith(".csv") ? parseCsv(text) : parseParagraphs(text);
}
