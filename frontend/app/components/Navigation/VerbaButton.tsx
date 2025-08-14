"use client";

import React from "react";
import { FaStar } from "react-icons/fa";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { Loader2 } from "lucide-react";

interface VerbaButtonProps {
  title?: string;
  Icon?: typeof FaStar;
  onClick?: (...args: any[]) => void;
  onMouseEnter?: (...args: any[]) => void;
  onMouseLeave?: (...args: any[]) => void;
  disabled?: boolean;
  key?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  selected?: boolean;
  selected_color?: string;
  selected_text_color?: string;
  circle?: boolean;
  text_class_name?: string;
  loading?: boolean;
  text_size?: string;
  icon_size?: number;
  onClickParams?: any[];
}

const VerbaButton: React.FC<VerbaButtonProps> = ({
  title = "",
  key = "Button" + title,
  Icon,
  onClick = () => {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  disabled = false,
  className = "",
  text_class_name = "",
  selected = false,
  selected_color = "bg-button-verba",
  selected_text_color = "text-text-verba-button",
  text_size = "text-xs",
  icon_size = 12,
  type = "button",
  loading = false,
  circle = false,
  onClickParams = [],
}) => {
  const getVariant = () => {
    if (selected) {
      if (selected_color.includes("warning")) return "destructive";
      if (selected_color.includes("primary")) return "default";
      if (selected_color.includes("secondary")) return "secondary";
      return "default";
    }
    return "outline";
  };

  return (
    <Button
      type={type}
      key={key}
      variant={getVariant()}
      className={cn(
        "p-3 transition-all active:scale-95 scale-100 duration-300 flex gap-1 items-center justify-center",
        circle ? "rounded-full" : "rounded-lg",
        selected && selected_color && selected_text_color,
        !selected && "bg-button-verba text-text-alt-verba-button hover:bg-button-hover-verba hover:text-text-verba-button",
        className
      )}
      onClick={(e) => onClick(e, ...onClickParams)}
      disabled={disabled || loading}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={icon_size} className="w-[20px]" />}
          {title && (
            <span title={title} className={cn(text_size, text_class_name)}>
              {title}
            </span>
          )}
        </>
      )}
    </Button>
  );
};

export default VerbaButton;