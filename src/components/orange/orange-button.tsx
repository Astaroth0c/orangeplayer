"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "glass" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface OrangeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-graphite font-semibold hover:bg-brand-light shadow-[0_8px_24px_-8px_rgba(255,120,31,0.55)]",
  secondary:
    "glass-card text-foreground hover:border-brand/60 hover:text-brand",
  ghost: "text-foreground/80 hover:text-brand hover:bg-white/5",
  glass:
    "glass text-foreground border border-white/10 hover:border-brand/60 hover:brand-glow-soft",
  danger: "bg-destructive text-white hover:bg-destructive/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-md",
  md: "h-11 px-5 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  xl: "h-14 px-8 text-lg gap-2.5 rounded-xl",
};

export const OrangeButton = forwardRef<HTMLButtonElement, OrangeButtonProps>(
  ({ variant = "primary", size = "md", icon, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-focusable
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
          "disabled:opacity-40 disabled:pointer-events-none select-none",
          "active:scale-[0.97]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  },
);

OrangeButton.displayName = "OrangeButton";
