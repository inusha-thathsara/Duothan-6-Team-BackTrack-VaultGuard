"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Check, ChevronDown, Search } from "lucide-react";
import { PayeeItem } from "@/context/VaultGuardContext";

interface PayeeSelectProps {
  payees: PayeeItem[];
  selectedPayeeId: string;
  onSelectPayee: (id: string) => void;
}

export const PayeeSelect: React.FC<PayeeSelectProps> = ({
  payees,
  selectedPayeeId,
  onSelectPayee,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const personPayees = payees.filter((p) => p.type === "PERSON" || !p.type);
  const selectedPayee = personPayees.find((p) => p.id === selectedPayeeId) || personPayees[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPayees = personPayees.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-input border border-border text-foreground text-xs hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-left cursor-pointer"
      >
        {selectedPayee ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-foreground">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground truncate">
                  {selectedPayee.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 border border-border text-muted-foreground">
                  {selectedPayee.bankCode || "VG-BANK"}
                </span>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                Account: {selectedPayee.accountNumber}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Select a payee...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {personPayees.length > 4 && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search payee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring font-sans"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {filteredPayees.length > 0 ? (
              filteredPayees.map((p) => {
                const isSelected = p.id === selectedPayee?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPayee(p.id);
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
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {p.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted border border-border text-muted-foreground">
                            {p.bankCode || "VG-BANK"}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                          {p.accountNumber}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No payees found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
