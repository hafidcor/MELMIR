import './globals.css';
import type { Metadata } from 'next';

import { Navegacion } from '@/components/navegacion';
import { hayUsuarios, obtenerSesion } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'MELMIR ERP',
  description: 'ERP para operaciones de hidromiel',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Sesión opcional: en modo abierto (sin usuarios) no hay usuario y la
  // app funciona como hoy. Si la base no responde, se sigue abierto.
  let usuario: { nombre: string; rol: string } | null = null;
  let authActiva = false;
  try {
    usuario = await obtenerSesion();
    authActiva = await hayUsuarios();
  } catch {
    usuario = null;
    authActiva = false;
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
        <Navegacion usuario={usuario} authActiva={authActiva} />
        {/* Espacio inferior en móvil para la barra de navegación fija. */}
        <div className="pb-24 md:pb-0">{children}</div>
      </body>
    </html>
  );
}
