"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";

type InputWithIconProps = React.ComponentProps<"input"> & {
  icon: React.ReactNode;
  containerClassName?: string;
};

export function InputWithIcon({ icon, className, containerClassName, ...props }: InputWithIconProps) {
  return (
    <div
      data-slot="input-with-icon"
      className={cn(
        "flex items-center gap-2 bg-bg-verba shadow-md rounded px-2 py-1",
        containerClassName
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <input
        className={cn(
          "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full",
          className
        )}
        {...props}
      />
    </div>
  );
}

