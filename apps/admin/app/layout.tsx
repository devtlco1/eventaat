import type { Metadata } from 'next';
import { ThemeInitScript } from '../components/ThemeInitScript';
import './globals.css';

export const metadata: Metadata = {
  title: 'eventaat Admin',
  description: 'eventaat admin dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeInitScript />
        {children}
      </body>
    </html>
  );
}
