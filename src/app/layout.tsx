import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OBIN SHOP',
  description: 'Scalable E-commerce Application with Firebase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#FAFAFA] font-sans">
        {children}
      </body>
    </html>
  );
}
