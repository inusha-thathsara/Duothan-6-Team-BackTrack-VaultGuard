"use client";

import React, { useState, useRef, useEffect } from "react";
import { CreditCard, Check, ChevronDown, Wallet } from "lucide-react";
import { AccountItem } from "@/context/VaultGuardContext";

interface AccountSelectProps {
  accounts: AccountItem[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
}

export const AccountSelect: React.FC<AccountSelectProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-input border border-border text-foreground text-xs hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-left cursor-pointer"
      >
        {selectedAccount ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-foreground">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  {selectedAccount.type}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  ({selectedAccount.accountNumber})
                </span>
              </div>
              <p className="font-mono text-[11px] text-foreground font-bold truncate mt-0.5">
                Balance: {selectedAccount.currency} {selectedAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Select an account...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 p-1.5 space-y-1">
          {accounts.map((acc) => {
            const isSelected = acc.id === selectedAccount?.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  onSelectAccount(acc.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-xs cursor-pointer ${
                  isSelected
                    ? "bg-muted/80 text-foreground border border-border"
                    : "hover:bg-muted/40 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground uppercase tracking-wider">
                        {acc.type}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ({acc.accountNumber})
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-foreground font-bold mt-0.5">
                      {acc.currency} {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
