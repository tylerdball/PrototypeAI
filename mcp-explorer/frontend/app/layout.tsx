import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Explorer",
  description: "Learn, browse, and build Model Context Protocol servers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-[var(--border)] px-6 py-3 flex items-center gap-3">
          <span className="text-lg">🔌</span>
          <span className="font-semibold text-white">MCP Explorer</span>
          <span className="text-xs text-[var(--muted)] ml-1">Model Context Protocol — learn, explore, and build</span>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
