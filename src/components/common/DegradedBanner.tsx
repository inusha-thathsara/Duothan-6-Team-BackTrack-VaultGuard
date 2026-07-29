"use client";

import React from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { ShieldAlert, RefreshCw } from "lucide-react";

export const DegradedBanner: React.FC = () => {
  const { isPaymentsDegraded, togglePaymentsDegraded } = useVaultGuard();

  if (!isPaymentsDegraded) return null;

  return (
    <div className="bg-amber-950/80 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-amber-100">Payments Degraded Mode Active (FR-08):</strong> Accounts service operates in read-only fallback mode. Transfers & bill payments are restricted.
          </span>
        </div>
        <button
          onClick={togglePaymentsDegraded}
          className="shrink-0 flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-100 rounded text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Restore Payments
        </button>
      </div>
    </div>
  );
};

