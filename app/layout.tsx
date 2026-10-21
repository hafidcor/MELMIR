import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MELMIR ERP',
  description: 'ERP para operaciones de hidromiel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
