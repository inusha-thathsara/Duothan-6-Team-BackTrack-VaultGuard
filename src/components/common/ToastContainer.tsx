"use client";

import React from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useVaultGuard();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl border transition-all duration-300 transform translate-y-0 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
              : toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/40 text-rose-100"
              : toast.type === "warning"
              ? "bg-amber-950/90 border-amber-500/40 text-amber-100"
              : "bg-slate-900/90 border-cyan-500/40 text-cyan-100"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-cyan-400" />}
          </div>
          <div className="flex-1 text-sm">
            <h4 className="font-semibold leading-snug">{toast.title}</h4>
            <p className="mt-1 opacity-90 text-xs leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
