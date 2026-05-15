import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Allo Health | Better Sex, Better Life",
  description:
    "Science-backed solutions for sexual health, delivered with care.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] antialiased font-sans">
        <header className="border-b border-[var(--border-subtle)] bg-white sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-sans font-bold text-2xl tracking-tight text-[#111]">
                allo<span className="text-[var(--gold)]">health</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link
                href="/"
                className="text-[#333] hover:text-[var(--gold)] transition-colors"
              >
                Inventory
              </Link>
              <Link
                href="#"
                className="text-[#333] hover:text-[var(--gold)] transition-colors"
              >
                Categories
              </Link>
              <Link
                href="#"
                className="text-[#333] hover:text-[var(--gold)] transition-colors"
              >
                Warehouses
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <button className="px-6 py-2.5 rounded-full bg-[var(--gold)] text-white text-sm font-semibold hover:bg-[var(--gold-hover)] transition-all shadow-md">
                Admin Login
              </button>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[var(--border-subtle)] mt-20 bg-[var(--surface-1)]">
          <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">
            <span>
              © {new Date().getFullYear()} Allo Health. All rights reserved.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
