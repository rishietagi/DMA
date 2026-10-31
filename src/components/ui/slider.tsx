"use client";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = props.value ?? props.defaultValue ?? [props.min ?? 0];
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={props["aria-label"]}
          className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm transition-[box-shadow] hover:ring-4 hover:ring-ring/20 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-hidden"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
export { Slider };
