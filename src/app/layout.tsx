import type { Metadata } from "next";
import "./globals.css";
import { VaultGuardProvider } from "@/context/VaultGuardContext";

export const metadata: Metadata = {
  title: "VaultGuard — Secure Digital Banking Platform",
  description:
    "VaultGuard is a zero-trust, attack-isolated digital banking platform rebuilt on Google Cloud Platform microservices following the malware crisis.",
  keywords: [
    "VaultGuard",
    "Digital Banking",
    "Zero Trust",
    "Microservices",
    "FinTech",
  ],
  authors: [{ name: "VaultGuard Engineering Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#050b14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
        <VaultGuardProvider>{children}</VaultGuardProvider>
      </body>
    </html>
  );
}
