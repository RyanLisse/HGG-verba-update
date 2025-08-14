"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";

type RangeProps = React.ComponentProps<"input"> & {
  min?: number | string;
  max?: number | string;
  step?: number | string;
};

export function Range({ className, ...props }: RangeProps) {
  return (
    <input
      type="range"
      data-slot="range"
      className={cn(
        "appearance-none w-full h-1 rounded bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
        "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary",
        className
      )}
      {...props}
    />
  );
}

