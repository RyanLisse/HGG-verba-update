import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "./providers/query-provider";

export const metadata: Metadata = {
  title: "Verba",
  description: "The GoldenRAGtriever",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="icon.ico" />
      <link rel="icon" href="static/icon.ico" />
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
