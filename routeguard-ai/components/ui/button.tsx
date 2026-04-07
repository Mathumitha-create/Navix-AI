import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ComponentPropsWithoutRef<"a"> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-cyan-200/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(191,245,255,0.94))] text-slate-950 shadow-[0_18px_60px_rgba(90,224,255,0.18)] hover:shadow-[0_22px_70px_rgba(90,224,255,0.24)]",
  secondary:
    "border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] text-white hover:border-cyan-200/20 hover:bg-white/10",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <a
      className={cn(
        "inline-flex min-w-[11rem] items-center justify-center rounded-full border px-6 py-3 text-sm font-medium tracking-[0.01em] transition-all duration-300 backdrop-blur-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
