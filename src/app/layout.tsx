import type { Viewport } from 'next';
import Navigation from '@/components/Navigation';
import './globals.css';
import './splash.css';
import GlobeBackground from '@/components/GlobeBackground';
import WaveBackground from '@/components/WaveBackground';
import SplashScreen from '@/components/SplashScreen';
import MobileLock from '@/components/MobileLock';

// Fits the screen exactly and blocks zoom on phones
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="bg-transparent">
        <MobileLock />
        <WaveBackground />
        <GlobeBackground />
        <main className="pb-16">{children}</main>
        <Navigation />
        <SplashScreen />
      </body>
    </html>
  );
}
