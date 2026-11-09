'use client';

import { usePathname } from 'next/navigation';

/**
 * Contenedor del contenido del ERP. En escritorio (lg en adelante) deja
 * a la izquierda el hueco de la barra lateral fija (272 px, mismo ancho
 * que components/navegacion.tsx) para que nada quede tapado. En /login
 * no hay barra lateral y el contenido ocupa todo el ancho. El padding
 * inferior reserva el hueco de la barra de navegación móvil.
 */
export function ContenidoPrincipal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sinBarraLateral = pathname === '/login';

  return (
    <div className={sinBarraLateral ? 'pb-24 md:pb-0' : 'pb-24 md:pb-0 lg:pl-[272px]'}>
      {children}
    </div>
  );
}
