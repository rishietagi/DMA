/**
 * Server-side document parsing → plain-text segments with locations (SCORING_ENGINE.md §7.1).
 * PDF (unpdf, per page) · DOCX (mammoth, per paragraph) · CSV (papaparse, per row) · MD/TXT (per paragraph).
 */
import "server-only";
import Papa from "papaparse";
import type { ParsedSegment } from "@/lib/ai/types";

export const SUPPORTED = [".pdf", ".docx", ".csv", ".md", ".markdown", ".txt"] as const;

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function paragraphs(text: string, prefix = "¶"): ParsedSegment[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^#+\s*$/.test(p))
    .map((p, i) => ({ text: p.replace(/^#+\s*/gm, ""), location: `${prefix}${i + 1}` }));
}

export function parseCsv(text: string): ParsedSegment[] {
  const out = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  return out.data.map((row, i) => ({
    // "Metric: Fill rate. Value: 87%. Comment: …" — every column becomes a labelled clause
    text: Object.entries(row)
      .filter(([, v]) => v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${String(v).trim()}`)
      .join(". ")
      .concat("."),
    location: `Row ${i + 2}`,
  }));
}

export async function parseFile(file: File): Promise<ParsedSegment[]> {
  const ext = extOf(file.name);
  const buf = new Uint8Array(await file.arrayBuffer());
  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: false });
    return (text as string[]).flatMap((page, p) =>
      paragraphs(page, `p. ${p + 1} ¶`).map((s) => ({ ...s, location: s.location.replace(" ¶", ", ¶") })),
    );
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return paragraphs(value);
  }
  const text = new TextDecoder("utf-8").decode(buf);
  if (ext === ".csv") return parseCsv(text);
  if (ext === ".md" || ext === ".markdown" || ext === ".txt") return paragraphs(text);
  throw new Error(`Unsupported file type "${ext || file.name}". Use PDF, DOCX, CSV, MD or TXT.`);
}
