import { cn } from "@/lib/utils";

export function PageHeader({
  stage,
  title,
  description,
  actions,
  className,
}: {
  stage?: number;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        <h1 className="flex items-center gap-2.5 text-[22px] font-semibold tracking-tight">
          {stage !== undefined && (
            <span
              aria-label={`Stage ${stage} of 8`}
              className="grid size-6 place-items-center rounded-md border bg-card text-xs font-semibold tabular text-muted-foreground"
            >
              {stage}
            </span>
          )}
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-6", className)}>{children}</div>;
}

/** Section heading inside a page (not a card title). */
export function SectionTitle({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-sm font-semibold">{children}</h2>
      {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
    </div>
  );
}
