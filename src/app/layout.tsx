import type { Metadata } from "next";
import "./globals.css";
import { VaultGuardProvider } from "@/context/VaultGuardContext";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("h-full antialiased dark", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <VaultGuardProvider>{children}</VaultGuardProvider>
      </body>
    </html>
  );
}

