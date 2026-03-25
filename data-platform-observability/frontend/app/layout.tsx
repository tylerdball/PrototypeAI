import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Platform Observability",
  description: "Dataset catalog, SLO tracking, and pipeline health",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 flex items-center gap-3">
          <a href="/" className="text-lg font-bold text-brand-400 tracking-tight hover:text-brand-500 transition-colors">
            Data Platform Observability
          </a>
          <span className="ml-auto text-xs text-[var(--muted)]">Unified Data Platform</span>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
