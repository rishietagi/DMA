import { ClipboardCheck, FileStack, SlidersHorizontal, Trophy, type LucideIcon } from "lucide-react";

export interface StepItem {
  href: string;
  step: 1 | 2 | 3 | 4;
  label: string;
  icon: LucideIcon;
}

/** The whole assessment: four steps. Keys 1–4 jump between them. */
export const STEPS: StepItem[] = [
  { href: "/", step: 1, label: "Define & Focus", icon: SlidersHorizontal },
  { href: "/inputs", step: 2, label: "Assess & Validate", icon: FileStack },
  { href: "/review", step: 3, label: "Diagnose", icon: ClipboardCheck },
  { href: "/results", step: 4, label: "Prioritize & Roadmap", icon: Trophy },
];

export function stepFor(pathname: string): StepItem {
  return STEPS.find((s) => s.href !== "/" && pathname.startsWith(s.href)) ?? STEPS[0]!;
}
