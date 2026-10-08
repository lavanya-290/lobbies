import type { Metadata } from "next";
import "./globals.css";
import BrandLogoBadge from "@/components/BrandLogoBadge";

export const metadata: Metadata = {
  title: "Lobbies — Multiplayer Retro Chibi Hotel",
  description: "Explore rooms, customize houses, and hang out with friends in a vibrant retro world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BrandLogoBadge />
        {children}
      </body>
    </html>
  );
}
