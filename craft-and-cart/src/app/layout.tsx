import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import YarnThread from "@/components/YarnThread";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["italic", "normal"] });

export const metadata: Metadata = {
  title: "Craft & Cart — Handmade crochet with a South Indian soul",
  description: "Everlasting crochet bouquets, keychains and accessories inspired by South Indian tradition. Handmade and shipped across India.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7a1d00" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${fraunces.variable}`}>
      <body className="relative">
        <Providers>
          <YarnThread />
          <div className="kolam-side left" aria-hidden />
          <div className="kolam-side right" aria-hidden />
          <Navbar />
          <CartDrawer />
          <main className="px-[var(--side)]">{children}</main>
          <div className="px-[var(--side)] pb-16 sm:pb-0"><Footer /></div>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
