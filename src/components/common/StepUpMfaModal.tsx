"use client";

import React, { useState, useEffect } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { ShieldCheck, Lock, Smartphone, RefreshCw, X } from "lucide-react";

export const StepUpMfaModal: React.FC = () => {
  const { isMfaModalOpen, closeMfaModal, pendingMfaAction, addToast } = useVaultGuard();
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

  if (!isMfaModalOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`mfa-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`mfa-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      addToast({
        type: "error",
        title: "Invalid Verification Code",
        message: "Please enter all 6 digits from your Authenticator App.",
      });
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      addToast({
        type: "success",
        title: "Step-Up Authorization Granted",
        message: "Cryptographic signature verified against Cloud KMS key policy.",
      });

      if (pendingMfaAction) {
        pendingMfaAction();
      }

      setCode(["", "", "", "", "", ""]);
      setTimer(30);
      closeMfaModal();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative max-w-md w-full glass-panel rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl">
        <button
          onClick={closeMfaModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-400 mint-glow">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white">Step-Up Authorization Required</h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            <strong className="text-emerald-400">FR-11 Security Control:</strong> This high-risk transaction requires verification via TOTP Authenticator.
          </p>

          <div className="my-6 w-full">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Enter 6-Digit Verification Code
            </label>
            <div className="flex justify-between gap-2">
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
                  className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-slate-950/80 border border-slate-700 text-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between w-full text-xs text-slate-400 mb-6 px-1">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Protected by Identity Platform
            </span>
            <span className="text-slate-400">
              Code expires in <strong className="text-emerald-400">{timer}s</strong>
            </span>
          </div>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleVerify}
              disabled={isVerifying || code.join("").length < 6}
              className="w-full py-3 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                "Verify & Authorize Transaction"
              )}
            </button>
            <button
              onClick={() => {
                setCode(["1", "3", "5", "7", "9", "2"]);
                addToast({
                  type: "info",
                  title: "Mock Code Filled",
                  message: "Test MFA code '135792' inserted for quick demo verification.",
                });
              }}
              className="text-xs text-emerald-400 hover:underline py-1"
            >
              Auto-fill Demo Code (135792)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
