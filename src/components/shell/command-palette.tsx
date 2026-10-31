"use client";
import { useRouter } from "next/navigation";
import { FileStack, Gauge, Moon, PlayCircle, RotateCcw, Sparkles, ToggleLeft } from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useDemoActions } from "@/lib/actions";
import { capabilityLabel, FUNCTION_SHORT } from "@/lib/labels";
import { seed } from "@/lib/seed";
import { useSession } from "@/lib/store/session";
import { ALL_NAV } from "./nav";

export function CommandPalette({
  open,
  onOpenChange,
  onStartTour,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStartTour: () => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mode = useSession((s) => s.mode);
  const setMode = useSession((s) => s.setMode);
  const setAgentOpen = useSession((s) => s.setAgentOpen);
  const actions = useDemoActions();

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Go to a stage, find a capability or run an action…" />
      <CommandList>
        <CommandEmpty>Nothing matches. Try a function, capability or stage name.</CommandEmpty>
        <CommandGroup heading="Go to">
          {ALL_NAV.map((n) => (
            <CommandItem key={n.href} value={`go ${n.label}`} onSelect={() => run(() => router.push(n.href))}>
              <n.icon />
              {n.stage ? `${n.stage}. ` : ""}
              {n.label}
              <CommandShortcut>{n.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="run guided assessment tour" onSelect={() => run(onStartTour)}>
            <PlayCircle />
            Run guided assessment
          </CommandItem>
          <CommandItem value="load demo evidence documents" onSelect={() => run(() => void actions.loadDemoEvidence())}>
            <FileStack />
            Load and analyse demo evidence
          </CommandItem>
          <CommandItem value="run ai scoring pass" onSelect={() => run(() => void actions.runScoring())}>
            <Gauge />
            Run AI scoring pass
          </CommandItem>
          <CommandItem value="open agent console" onSelect={() => run(() => setAgentOpen(true))}>
            <Sparkles />
            Open agent console
            <CommandShortcut>.</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="toggle baseline evidence mode"
            onSelect={() => run(() => setMode(mode === "evidence" ? "baseline" : "evidence"))}
          >
            <ToggleLeft />
            {mode === "evidence" ? "Show 2025 baseline only" : "Show evidence-based scores"}
          </CommandItem>
          <CommandItem value="toggle theme dark light" onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
            <Moon />
            Toggle theme
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem value="reset demo session" onSelect={() => run(actions.resetDemo)}>
            <RotateCcw />
            Reset demo session
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Capabilities">
          {seed.baseline.capabilities.map((c) => (
            <CommandItem
              key={c.id}
              value={`cap ${c.name} ${c.id} ${FUNCTION_SHORT[c.primaryFunctionId]} ${c.system ?? ""}`}
              onSelect={() => run(() => router.push(`/scoring?cap=${c.id}`))}
            >
              <Gauge />
              <span className="truncate">{capabilityLabel(c.id)}</span>
              <span className="ml-auto text-xs text-muted-foreground">{FUNCTION_SHORT[c.primaryFunctionId]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
