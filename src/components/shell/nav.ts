import { ClipboardCheck, FileStack, SlidersHorizontal, Trophy, type LucideIcon } from "lucide-react";

export interface StepItem {
  href: string;
  step: 1 | 2 | 3 | 4;
  label: string;
  icon: LucideIcon;
}

/** The whole assessment: four steps. Keys 1–4 jump between them. */
export const STEPS: StepItem[] = [
  { href: "/", step: 1, label: "Scope", icon: SlidersHorizontal },
  { href: "/inputs", step: 2, label: "Gather inputs", icon: FileStack },
  { href: "/review", step: 3, label: "Review levels", icon: ClipboardCheck },
  { href: "/results", step: 4, label: "Results", icon: Trophy },
];

export function stepFor(pathname: string): StepItem {
  return STEPS.find((s) => s.href !== "/" && pathname.startsWith(s.href)) ?? STEPS[0]!;
}
