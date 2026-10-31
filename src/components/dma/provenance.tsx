import { ShieldCheck, Sparkles, UserPen } from "lucide-react";
import type { ValidationStatus } from "@/lib/engine";
import type { Validation } from "@/lib/schema";
import { cn } from "@/lib/utils";

/** "AI suggested" until validated; "Validated by <name>" after (CLAUDE.md UI conventions). */
export function ProvenanceLabel({
  status,
  validation,
  compact = false,
  className,
}: {
  status: ValidationStatus;
  validation?: Validation;
  compact?: boolean;
  className?: string;
}) {
  if (status === "suggested")
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-ai-foreground", className)}>
        <Sparkles className="size-3.5" aria-hidden />
        {compact ? "AI" : "AI suggested"}
      </span>
    );
  const Icon = status === "overridden" ? UserPen : ShieldCheck;
  const who = validation?.by.split(" (")[0];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-validated", className)}>
      <Icon className="size-3.5" aria-hidden />
      {compact ? (status === "overridden" ? "Overridden" : "Validated") : `${status === "overridden" ? "Overridden" : "Validated"} by ${who}`}
    </span>
  );
}

/** Surface wrapper: gradient hairline while AI-suggested, solid validated border after. */
export function AiSurface({
  validated = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { validated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card",
        validated ? "border border-validated/60" : "ai-surface",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AiTag({ className, children = "AI suggested" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-ai-soft px-1.5 py-0.5 text-[11px] font-medium text-ai-foreground", className)}>
      <Sparkles className="size-3" aria-hidden />
      {children}
    </span>
  );
}
