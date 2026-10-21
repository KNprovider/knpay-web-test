import type { Metadata } from "next";
import "./globals.css";
import GlobeBackground from "@/components/GlobeBackground";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "KNprovider",
  description: "Known. Needed. Proven.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-knpay-bg text-knpay-text antialiased">
        <GlobeBackground />
        {children}
        <SplashScreen />
      </body>
    </html>
  );
}
