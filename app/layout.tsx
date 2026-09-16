import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./components/theme/theme-provider";
import { parseThemePreference, THEME_COOKIE_NAME } from "./lib/theme";
import type { RootLayoutProps } from "./layout.types";
import "./globals.css";

// Nonce-based CSP requires request-time rendering so every response gets a fresh nonce.
export const dynamic = "force-dynamic";

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

export default async function RootLayout({ children }: RootLayoutProps) {
  const theme = parseThemePreference((await cookies()).get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground selection:bg-accent/30 selection:text-foreground">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
