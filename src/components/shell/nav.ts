import {
  Columns3,
  FileStack,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  MessagesSquare,
  Presentation,
  Route,
  SlidersHorizontal,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** journey stage number (1–8); undefined for Cockpit / Synthesis */
  stage?: number;
  capability?: string;
  shortcut: string;
}

export const COCKPIT: NavItem = { href: "/", label: "Engagement cockpit", short: "Cockpit", icon: LayoutDashboard, shortcut: "G H" };

export const JOURNEY: NavItem[] = [
  { href: "/scope", label: "Scope & framework", short: "Scope", icon: SlidersHorizontal, stage: 1, shortcut: "G 1" },
  { href: "/evidence", label: "Evidence hub", short: "Evidence", icon: FileStack, stage: 2, capability: "Evidence ingestion", shortcut: "G 2" },
  { href: "/interviews", label: "Interview intelligence", short: "Interviews", icon: MessagesSquare, stage: 3, capability: "Interview intelligence", shortcut: "G 3" },
  { href: "/process", label: "Process lens", short: "Process", icon: Workflow, stage: 4, capability: "Process analysis", shortcut: "G 4" },
  { href: "/scoring", label: "Scoring workbench", short: "Scoring", icon: Gauge, stage: 5, capability: "Scoring support", shortcut: "G 5" },
  { href: "/compare", label: "Compare & themes", short: "Compare", icon: Columns3, stage: 6, capability: "Cross-functional comparison", shortcut: "G 6" },
  { href: "/opportunities", label: "Opportunity studio", short: "Opportunities", icon: Lightbulb, stage: 7, capability: "Use cases & prioritisation", shortcut: "G 7" },
  { href: "/roadmap", label: "Roadmap & whitespaces", short: "Roadmap", icon: Route, stage: 8, capability: "Roadmap", shortcut: "G 8" },
];

export const SYNTHESIS: NavItem = { href: "/synthesis", label: "Executive synthesis", short: "Synthesis", icon: Presentation, shortcut: "G 9" };

export const ALL_NAV: NavItem[] = [COCKPIT, ...JOURNEY, SYNTHESIS];
