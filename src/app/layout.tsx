import { Inter } from 'next/font/google';
import '../globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'FootManager Online',
  description: 'Massively Multiplayer Online Football Management Game',
};

import { TooltipProvider } from '@/components/ui/tooltip';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <TooltipProvider>
          <Providers>{children}</Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
