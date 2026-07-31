"use client";

import React from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useVaultGuard();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-xs transition-all ${
            toast.type === "success"
              ? "bg-card border-border text-foreground"
              : toast.type === "error"
              ? "bg-card border-rose-500/30 text-foreground"
              : toast.type === "warning"
              ? "bg-card border-amber-500/30 text-foreground"
              : "bg-card border-slate-700 text-foreground"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
            {toast.type === "error" && <XCircle className="w-4 h-4 text-rose-400" />}
            {toast.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-cyan-400" />}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-xs text-foreground leading-snug">{toast.title}</h4>
            <p className="mt-0.5 text-muted-foreground text-[11px] leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

