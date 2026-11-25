import type { Metadata } from "next";
import "./globals.css";

// No next/font/google: fonts come from local system stacks (see globals.css)
// so production builds never need network access.

export const metadata: Metadata = {
  title: "Soniaa — The Clarity Engine",
  description:
    "A closer look at Soniaa’s experience, thinking and approach to business.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
