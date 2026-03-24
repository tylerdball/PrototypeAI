import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RACI Project Manager",
  description: "Build and manage RACI matrices with AI suggestions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
          <a href="/" className="font-semibold text-white hover:text-brand-500 transition-colors">
            RACI Project Manager
          </a>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
