import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Habbo Clone — Phase 0",
  description: "Prototype house/world loop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#111", color: "#eee", fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
