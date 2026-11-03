"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { Label } from "@/components/ui/misc";
import type { CustomProcess } from "@/lib/process-input";
import { cn } from "@/lib/utils";

const parseWords = (s: string) =>
  [...new Set(s.split(",").map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3))];

/** Name + optional keywords for a process the consultant adds or edits. */
export function ProcessForm({
  initial,
  taken,
  onSave,
  onCancel,
}: {
  initial?: Pick<CustomProcess, "name" | "keywords">;
  /** names already used in this function (excluding the one being edited) */
  taken: readonly string[];
  onSave: (name: string, keywords: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [words, setWords] = React.useState(initial?.keywords.join(", ") ?? "");
  const clean = name.trim().replace(/\s+/g, " ");
  const clash = taken.some((t) => t.toLowerCase() === clean.toLowerCase());
  const ok = clean.length >= 3 && !clash;
  const id = React.useId();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3 sm:col-span-2 lg:col-span-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave(clean, parseWords(words));
      }}
      data-testid="process-form"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>Process name</Label>
          <Input
            id={`${id}-name`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Returns management"
            aria-invalid={clash}
            data-testid="cp-name"
          />
          {clash && <p className="text-[11px] text-destructive">A process with this name already exists.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-words`}>Words that point to it (optional)</Label>
          <Input
            id={`${id}-words`}
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder="e.g. returns, reverse logistics"
            data-testid="cp-words"
          />
          <p className="text-[11px] text-muted-foreground">Comma-separated. The AI places document sentences with these words on this process.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!ok} data-testid="cp-save">
          {initial ? "Save changes" : "Add process"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Dashed tile that opens the add form. */
export function AddProcessTile({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="add-process"
      className={cn(
        "flex min-h-14 items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[13px] text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Plus className="size-4" aria-hidden />
      Add a process
    </button>
  );
}
