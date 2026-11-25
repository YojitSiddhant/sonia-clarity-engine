import type { Metadata } from "next";
import "./globals.css";

// No next/font/google: fonts come from local system stacks (see globals.css)
// so production builds never need network access.

export const metadata: Metadata = {
  title: "The Clarity Engine",
  description:
    "An editorial notebook on how Sonia connects brand, messaging, operations and people.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
