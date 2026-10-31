/**
 * Server-side document parsing → plain-text segments with locations (SCORING_ENGINE.md §7.1).
 * PDF (unpdf, per page) · DOCX (mammoth, per paragraph) · CSV (papaparse, per row) · MD/TXT (per paragraph).
 */
import "server-only";
import type { ParsedSegment } from "@/lib/ai/types";
import { parseCsv, parseParagraphs } from "./parse-text";

export const SUPPORTED = [".pdf", ".docx", ".csv", ".md", ".markdown", ".txt"] as const;

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function parseFile(file: File): Promise<ParsedSegment[]> {
  const ext = extOf(file.name);
  const buf = new Uint8Array(await file.arrayBuffer());
  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: false });
    return (text as string[]).flatMap((page, p) =>
      parseParagraphs(page.replace(/\n(?!\n)/g, "\n\n"), "¶").map((s) => ({ ...s, location: `p. ${p + 1}, ${s.location}` })),
    );
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return parseParagraphs(value);
  }
  const text = new TextDecoder("utf-8").decode(buf);
  if (ext === ".csv") return parseCsv(text);
  if (ext === ".md" || ext === ".markdown" || ext === ".txt") return parseParagraphs(text);
  throw new Error(`Unsupported file type "${ext || file.name}". Use PDF, DOCX, CSV, MD or TXT.`);
}
