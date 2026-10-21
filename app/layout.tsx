import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'MELMIR ERP',
  description: 'ERP para operaciones de hidromiel',
};

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/insumos', label: 'Insumos' },
  { href: '/recetas', label: 'Recetas' },
  { href: '/produccion', label: 'Producción' },
  { href: '/precios', label: 'Precios' },
  { href: '/historial', label: 'Historial' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                  M
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
                  <p className="text-sm font-semibold">ERP Hidromiel</p>
                </div>
              </Link>

              <nav className="hidden items-center gap-2 md:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Link href="/insumos">
                  <Button variant="outline" size="sm">
                    Insumos
                  </Button>
                </Link>
                <Link href="/recetas">
                  <Button size="sm">Nueva receta</Button>
                </Link>
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
