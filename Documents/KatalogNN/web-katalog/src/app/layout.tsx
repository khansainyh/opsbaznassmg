import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Katalog Nyah N'tin",
  description: "Menyajikan Katering, Jajanan Pasar, dan Aneka Kue dengan Resep Tradisional Asli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${playfair.variable} ${jakarta.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground m-0 p-0">
        {children}
      </body>
    </html>
  );
}
