import type { Metadata } from "next";
import "./globals.css";
import MobileNav from "./components/mobile-nav";

export const metadata: Metadata = {
  title: "Find Your Squad",
  description: "The easiest way to find teammates and explore tech events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <main className="pb-16 md:pb-0">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
