"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  open:       boolean;
  onClose:    () => void;
  onConfirm:  () => void;
  title:      string;
  message:    string;
  confirmLabel?: string;
  variant?:   "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = "Confirm", variant = "default", isLoading,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5 animate-scale-in">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              variant === "danger"  ? "bg-destructive/10" :
              variant === "warning" ? "bg-yellow-100 dark:bg-yellow-900/20" : "bg-muted"
            )}>
              <AlertTriangle className={cn(
                "w-5 h-5",
                variant === "danger"  ? "text-destructive" :
                variant === "warning" ? "text-yellow-600" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-semibold transition-colors",
                variant === "danger"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
