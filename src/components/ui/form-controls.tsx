/** Text inputs (shadcn Input + Textarea). */
import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full min-w-0 rounded-md border border-input bg-card text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(field, "flex h-9 px-3 py-1", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "flex field-sizing-content min-h-16 px-3 py-2", className)} {...props} />;
}
