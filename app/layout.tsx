// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EMS - Employee Management System',
  description: 'Modern Employee Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-[#171717] text-white">
            {/* <UserButton /> */}
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}