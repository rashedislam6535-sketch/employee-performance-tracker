import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "border-transparent bg-indigo-600 text-white",
  secondary: "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  outline: "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  destructive: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none", variants[variant], className)}
      {...props}
    />
  );
}

export function priorityVariant(p?: string | null): keyof typeof variants {
  return p === "High" ? "destructive" : p === "Medium" ? "warning" : "secondary";
}

export function statusVariant(s?: string | null): keyof typeof variants {
  return s === "Resolved" ? "success" : s === "In Progress" ? "info" : "warning";
}
