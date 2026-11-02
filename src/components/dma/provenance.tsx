import { ShieldCheck, Sparkles, UserPen } from "lucide-react";
import type { ProcessStatus, ProcessValidation } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** "AI suggested" until validated; "Validated by <name>" after (CLAUDE.md UI conventions). */
export function ProvenanceLabel({
  status,
  validation,
  className,
}: {
  status: ProcessStatus;
  validation?: ProcessValidation;
  className?: string;
}) {
  if (status === "suggested")
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-ai-foreground", className)}>
        <Sparkles className="size-3.5" aria-hidden />
        AI suggested
      </span>
    );
  const Icon = status === "overridden" ? UserPen : ShieldCheck;
  const who = validation?.by.split(" (")[0];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-validated", className)}>
      <Icon className="size-3.5" aria-hidden />
      {status === "overridden" ? "Changed" : "Validated"} by {who}
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
    <div className={cn("rounded-xl bg-card", validated ? "border border-validated/60" : "ai-surface", className)} {...props}>
      {children}
    </div>
  );
}
