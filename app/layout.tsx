import type { Metadata } from "next";
import { Providers } from "@/app/providers";

import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "TitikTemu",
  description: "UMKM tumbuh bersama transportasi kita.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
