import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flower Garden Log",
  description: "Records what is planted in each flower bed, across seasons.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
