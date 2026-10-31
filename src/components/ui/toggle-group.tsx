"use client";
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn("inline-flex w-fit items-center rounded-md border bg-card p-0.5 shadow-xs", className)}
      {...props}
    />
  );
}
function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1.5 rounded-[5px] px-2.5 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=on]:bg-secondary data-[state=on]:text-foreground [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
export { ToggleGroup, ToggleGroupItem };
