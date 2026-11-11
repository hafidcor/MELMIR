import './globals.css';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';

import { ContenidoPrincipal } from '@/components/contenido-principal';
import { BurbujaAsistente } from '@/components/burbuja-asistente';
import { Navegacion } from '@/components/navegacion';
import { obtenerConteoAlertasStock } from '@/app/actions/alertas';
import { hayUsuarios, obtenerSesion } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'MELMIR ERP',
  description: 'ERP para operaciones de hidromiel',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MELMIR',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ficha pública de hidromiel: sin menú del ERP ni sesión.
  const esPublica = headers().get('x-melmir-public') === '1';
  if (esPublica) {
    return (
      <html lang="es" suppressHydrationWarning>
        <body className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {children}
        </body>
      </html>
    );
  }

  // Sesión opcional: en modo abierto (sin usuarios) no hay usuario y la
  // app funciona como hoy. Si la base no responde, se sigue abierto.
  let usuario: { nombre: string; rol: string } | null = null;
  let authActiva = false;
  let alertasStock = 0;
  try {
    usuario = await obtenerSesion();
    authActiva = await hayUsuarios();
    alertasStock = await obtenerConteoAlertasStock();
  } catch {
    usuario = null;
    authActiva = false;
    alertasStock = 0;
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-parpadeo de tema: pone la clase 'dark' antes de pintar,
            según lo guardado en localStorage o prefers-color-scheme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('melmir-tema');if(t==='oscuro'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Navegacion usuario={usuario} authActiva={authActiva} alertasStock={alertasStock} />
        {/* Burbuja flotante del asistente: en todas las páginas internas
            (no en /login ni en la ficha pública, que usa otro layout). */}
        <BurbujaAsistente />
        {/* En escritorio el contenido se desplaza a la derecha de la barra
            lateral fija; en /login ocupa todo el ancho (ver el componente). */}
        <ContenidoPrincipal>{children}</ContenidoPrincipal>
      </body>
    </html>
  );
}
