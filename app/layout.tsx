import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { RootLayoutProps } from "./layout.types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevStash — Client-Encrypted Developer Vault",
  description:
    "Personal, vault-first developer workspace for encrypted secrets, .env configurations, private notes, and project tasks. Client-side envelope encryption with Argon2id + AES-256-GCM.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#05070d] text-[#e8eefb] selection:bg-[#6ea8ff]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
