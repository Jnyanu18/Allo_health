import type { Metadata } from "next";
import { Space_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Allo Inventory — Multi-Warehouse Reservation System",
  description:
    "Race-condition-safe inventory reservations across multiple warehouses. Built with Next.js, Prisma, Redis, and PostgreSQL.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#0a0a0a] text-[#e8e4dc] antialiased">
        <header className="border-b border-[#1e1e1e] glass sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-[#e8c547] flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="font-mono font-bold text-black text-sm">
                  A
                </span>
              </div>
              <span className="font-mono font-bold text-lg tracking-tight">
                ALLO<span className="text-[#e8c547]">.</span>
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-xs font-mono">
              <Link
                href="/"
                className="text-[#555] hover:text-[#e8c547] transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[1px] after:bg-[#e8c547] after:transition-all hover:after:w-full"
              >
                PRODUCTS
              </Link>
              <span className="text-[#222] select-none">|</span>
              <span
                className="text-[#333] cursor-default"
                title="Inventory management system"
              >
                v1.0
              </span>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[#1e1e1e] mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-xs font-mono text-[#333]">
            <span>ALLO INVENTORY © {new Date().getFullYear()}</span>
            <span>BUILT WITH NEXT.JS + PRISMA + REDIS</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
