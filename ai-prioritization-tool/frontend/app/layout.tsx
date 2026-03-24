import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Prioritization Tool",
  description: "Score and rank your backlog against strategic criteria using AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 flex items-center gap-3">
          <span className="text-lg font-bold text-brand-500 tracking-tight">AI Prioritization Tool</span>
          <span className="ml-auto text-xs text-[var(--muted)]">Backlog scoring powered by AI</span>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
