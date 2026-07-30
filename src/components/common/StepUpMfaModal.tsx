"use client";

import React, { useState, useEffect } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { ShieldCheck, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const StepUpMfaModal: React.FC = () => {
  const { isMfaModalOpen, closeMfaModal, pendingMfaAction, addToast } =
    useVaultGuard();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMfaModalOpen && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isMfaModalOpen, timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      document.getElementById(`mfa-input-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      document.getElementById(`mfa-input-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      addToast({ type: "error", title: "Invalid Code", message: "Please enter all 6 digits." });
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });

      setIsVerifying(false);

      if (res.ok) {
        addToast({ type: "success", title: "Authorization Granted", message: "Signature verified by Auth Service." });
        if (pendingMfaAction) pendingMfaAction();
        setCode(["", "", "", "", "", ""]);
        setTimer(30);
        closeMfaModal();
      } else {
        addToast({ type: "error", title: "MFA Verification Failed", message: "Invalid or expired TOTP code." });
      }
    } catch {
      setIsVerifying(false);
      addToast({ type: "error", title: "Network Error", message: "Failed to connect to authentication server." });
    }
  };

  return (
    <Dialog open={isMfaModalOpen} onOpenChange={(open) => !open && closeMfaModal()}>
      <DialogContent className="max-w-sm text-center gap-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center text-foreground">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <DialogHeader className="items-center">
            <DialogTitle>Step-Up Authorization</DialogTitle>
            <DialogDescription>
              High-risk action requires TOTP verification.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator />

        {/* OTP Inputs */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            6-Digit Code
          </p>
          <div className="flex justify-center gap-2">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`mfa-input-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-10 h-12 text-center text-xl font-bold rounded-lg bg-input border border-border text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono px-1">
          <span>Protected by KMS</span>
          <span>
            Expires in <strong className="text-foreground">{timer}s</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleVerify}
            disabled={isVerifying || code.join("").length < 6}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Authorize Transaction"
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCode(["1", "3", "5", "7", "9", "2"]);
              addToast({ type: "info", title: "Demo Code Filled", message: "Test code 135792 inserted." });
            }}
          >
            Auto-fill Demo Code (135792)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
