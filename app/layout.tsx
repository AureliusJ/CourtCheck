import { Inter, Playfair_Display } from 'next/font/google';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'CourtCheck — Ramsden Park',
  description: 'Real-time tennis court queue tracker for Ramsden Park, Toronto',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-brand-bg font-sans text-brand-text">
        <Providers>{children}</Providers>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
