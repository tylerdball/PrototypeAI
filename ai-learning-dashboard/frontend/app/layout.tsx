import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Learning Dashboard",
  description: "Interactive deep-dives into LLMs, RAG, MLOps, Model Drift & Registry",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">
        <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 flex items-center gap-3">
          <span className="text-lg font-bold text-white tracking-tight">AI Learning Dashboard</span>
          <span className="ml-auto text-xs text-[var(--muted)]">For ML Practitioners</span>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
