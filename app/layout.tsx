import "./globals.css";
import type { Metadata } from "next";

import ClientProviders from "./providers"; // we will create this next

export const metadata: Metadata = {
  title: "Cognitive Assessment",
  description: "Advanced Cognitive Testing Application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
