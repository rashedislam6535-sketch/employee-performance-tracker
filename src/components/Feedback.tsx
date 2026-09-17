"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              t.variant === "success" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
              t.variant === "error" && "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
              t.variant === "default" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            )}
          >
            {t.variant === "success" ? <Check className="h-3 w-3" /> : t.variant === "error" ? <AlertCircle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.description}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog() {
  const { confirmState } = useApp();
  const open = !!confirmState;
  const o = confirmState?.options;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && confirmState?.resolve(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                o?.destructive ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              {o?.destructive ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </span>
            <div>
              <DialogTitle>{o?.title}</DialogTitle>
              {o?.description && <DialogDescription className="mt-1">{o.description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => confirmState?.resolve(false)}>
            {o?.cancelText ?? "Cancel"}
          </Button>
          <Button variant={o?.destructive ? "destructive" : "default"} onClick={() => confirmState?.resolve(true)} autoFocus>
            {o?.confirmText ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
