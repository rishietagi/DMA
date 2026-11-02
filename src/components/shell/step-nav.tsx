"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEPS } from "./nav";

/** Back / Next at the foot of each step. */
export function StepNav({ step, nextLabel, onNext }: { step: 1 | 2 | 3 | 4; nextLabel?: string; onNext?: () => void }) {
  const prev = STEPS[step - 2];
  const next = STEPS[step];
  return (
    <div className="no-print flex items-center justify-between gap-3 border-t pt-5">
      {prev ? (
        <Button variant="ghost" asChild>
          <Link href={prev.href}>
            <ArrowLeft />
            {prev.label}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button asChild data-testid="next-step">
          <Link href={next.href} onClick={onNext}>
            {nextLabel ?? `Next: ${next.label}`}
            <ArrowRight />
          </Link>
        </Button>
      )}
    </div>
  );
}
