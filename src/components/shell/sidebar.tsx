"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";
import { COCKPIT, JOURNEY, SYNTHESIS, type NavItem } from "./nav";
import { useStageStatus, type StageStatus } from "./use-stage-status";

function StatusDot({ status }: { status: StageStatus }) {
  return (
    <span
      role="img"
      aria-label={status === "done" ? "Complete" : status === "active" ? "In progress" : "Not started"}
      className={cn(
        "size-2 shrink-0 rounded-full",
        status === "done" && "bg-validated",
        status === "active" && "bg-conf-med",
        status === "todo" && "border border-muted-foreground/40",
      )}
    />
  );
}

function Item({ item, status, collapsed }: { item: NavItem; status?: StageStatus; collapsed: boolean }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-card font-medium text-foreground shadow-xs ring-1 ring-border",
        collapsed && "justify-center px-0",
      )}
    >
      {item.stage !== undefined && !collapsed ? (
        <span className={cn("w-3.5 text-center text-[11px] tabular text-muted-foreground/80", active && "text-primary")}>{item.stage}</span>
      ) : (
        <item.icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
      )}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && status && <StatusDot status={status} />}
      {collapsed && status && <span className="absolute top-1.5 right-1.5"><StatusDot status={status} /></span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const status = useStageStatus();
  const collapsed = useSession((s) => s.sidebarCollapsed);
  const setCollapsed = useSession((s) => s.setSidebarCollapsed);
  const done = JOURNEY.filter((j) => status[j.href] === "done").length;

  return (
    <nav
      aria-label="Assessment journey"
      className={cn(
        "no-print flex shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[236px]",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 border-b px-4", collapsed && "justify-center px-0")}>
        <span className="grid size-7 place-items-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-primary-foreground">
          DMA
        </span>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold">Maturity workbench</p>
            <p className="truncate text-[11px] text-muted-foreground">KPMG Digital Solutions</p>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-3 scrollbar-thin">
        <Item item={COCKPIT} collapsed={collapsed} />
        <div>
          {!collapsed && (
            <div className="mb-1.5 flex items-baseline justify-between px-2.5">
              <p className="text-xs font-medium text-muted-foreground">Assessment journey</p>
              <p className="text-[11px] tabular text-muted-foreground">{done}/8</p>
            </div>
          )}
          <ol className="flex flex-col gap-0.5">
            {JOURNEY.map((j) => (
              <li key={j.href}>
                <Item item={j} status={status[j.href]} collapsed={collapsed} />
              </li>
            ))}
          </ol>
        </div>
        <div>
          {!collapsed && <p className="mb-1.5 px-2.5 text-xs font-medium text-muted-foreground">Output</p>}
          <Item item={SYNTHESIS} status={status["/synthesis"]} collapsed={collapsed} />
        </div>
      </div>

      <div className={cn("border-t p-2.5", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </nav>
  );
}
