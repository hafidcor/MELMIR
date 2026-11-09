'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ClipboardList,
  Contact,
  DatabaseBackup,
  Factory,
  FolderOpen,
  History,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Tag,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { TemaToggle } from '@/components/tema-toggle';
import { cerrarSesion } from '@/app/actions/auth';

type NavItem = {
  href: string;
  label: string;
  icono: React.ComponentType<{ className?: string }>;
  alerta?: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icono: Home },
  { href: '/dashboard', label: 'Dashboard', icono: LayoutDashboard },
  { href: '/insumos', label: 'Insumos', icono: Package },
  { href: '/recetas', label: 'Recetas', icono: BookOpen },
  { href: '/produccion', label: 'Producción', icono: Factory },
  { href: '/precios', label: 'Precios', icono: Tag },
  { href: '/ventas', label: 'Ventas', icono: ShoppingCart },
  { href: '/pos', label: 'Punto de venta', icono: Zap },
  { href: '/clientes', label: 'Clientes', icono: Contact },
  { href: '/pedidos', label: 'Pedidos', icono: ClipboardList },
  { href: '/archivos', label: 'Archivos', icono: FolderOpen },
  { href: '/historial', label: 'Historial', icono: History },
  { href: '/usuarios', label: 'Usuarios', icono: Users },
  { href: '/respaldo', label: 'Respaldos', icono: DatabaseBackup },
];

// Agrupación de la barra lateral de escritorio. El drawer móvil sigue
// mostrando la lista plana, como le gusta al usuario.
const GRUPOS_NAV: { titulo: string; hrefs: string[] }[] = [
  { titulo: 'Principal', hrefs: ['/', '/dashboard'] },
  { titulo: 'Operación', hrefs: ['/insumos', '/recetas', '/produccion', '/precios'] },
  { titulo: 'Ventas', hrefs: ['/ventas', '/pos', '/clientes', '/pedidos'] },
  { titulo: 'Sistema', hrefs: ['/archivos', '/historial', '/usuarios', '/respaldo'] },
];

// Ancho de la barra lateral de escritorio. app/layout.tsx desplaza el
// contenido con el mismo valor (lg:pl-[272px]) para que nada quede tapado.
const ANCHO_BARRA_LATERAL = 'w-[272px]';

// Barra inferior móvil: los 4 destinos más usados + el menú completo.
const BARRA_MOVIL: NavItem[] = [
  { href: '/', label: 'Inicio', icono: Home },
  { href: '/produccion', label: 'Producción', icono: Factory },
  { href: '/pos', label: 'Venta', icono: Zap },
  { href: '/ventas', label: 'Ventas', icono: ShoppingCart },
];

function esActivo(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function EnlaceNav({
  item,
  activo,
  alClick,
}: {
  item: NavItem;
  activo: boolean;
  alClick?: () => void;
}) {
  const Icono = item.icono;
  return (
    <Link
      href={item.href}
      onClick={alClick}
      aria-current={activo ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
        activo
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      <Icono className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
      {item.alerta !== undefined && item.alerta > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
          {item.alerta}
        </span>
      )}
    </Link>
  );
}

function LogoMelmir() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
        M
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          MELMIR
        </p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          ERP Hidromiel
        </p>
      </div>
    </Link>
  );
}

export function Navegacion({
  usuario,
  authActiva,
  alertasStock = 0,
}: {
  usuario: { nombre: string; rol: string } | null;
  authActiva: boolean;
  alertasStock?: number;
}) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const itemsNav = NAV_ITEMS.map((item) =>
    item.href === '/insumos' ? { ...item, alerta: alertasStock } : item
  );
  // En /login no hay barra lateral: la página queda como hoy, solo con
  // la cabecera. La ficha pública /hidromiel ni siquiera monta este
  // componente (ver app/layout.tsx).
  const esLogin = pathname === '/login';

  return (
    <>
      {/* Barra lateral fija de escritorio (lg en adelante): logo arriba,
          enlaces en vertical agrupados por sección y pie con tema y sesión.
          La barra superior horizontal con scroll ya no existe. */}
      {!esLogin && (
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden ${ANCHO_BARRA_LATERAL} flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-950`}
        >
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <LogoMelmir />
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
            {GRUPOS_NAV.map((grupo) => (
              <div key={grupo.titulo} className="mt-5 first:mt-0">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {grupo.titulo}
                </p>
                <div className="space-y-1">
                  {grupo.hrefs.map((href) => {
                    const item = itemsNav.find((i) => i.href === href);
                    if (!item) return null;
                    return (
                      <EnlaceNav
                        key={href}
                        item={item}
                        activo={esActivo(pathname, href)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Tema</span>
              <TemaToggle />
            </div>
            {usuario ? (
              <div className="mt-3 space-y-2">
                <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                  {usuario.nombre} · {usuario.rol}
                </p>
                <form action={cerrarSesion}>
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            ) : authActiva ? (
              <Link
                href="/login"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Link>
            ) : (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Aún no hay usuarios: la app está abierta. Crea el primer usuario en
                Usuarios.
              </p>
            )}
          </div>
        </aside>
      )}

      {/* Cabecera para móvil y tablet (en escritorio la sustituye la barra
          lateral). En /login se muestra a cualquier ancho, sin enlaces. */}
      <header
        className={`sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 ${
          esLogin ? '' : 'lg:hidden'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <LogoMelmir />

          <div className="flex items-center gap-2">
            <TemaToggle />
            {!esLogin && usuario ? (
              <>
                <span className="hidden max-w-40 truncate rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 sm:block dark:bg-slate-800 dark:text-slate-200">
                  {usuario.nombre} · {usuario.rol}
                </span>
                <form action={cerrarSesion}>
                  <button
                    type="submit"
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </form>
              </>
            ) : !esLogin && authActiva ? (
              <Link
                href="/login"
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Barra inferior fija en móvil: botones grandes y táctiles. */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="grid grid-cols-5">
          {BARRA_MOVIL.map((item) => {
            const Icono = item.icono;
            const activo = esActivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                  activo
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Icono className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú completo"
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <Menu className="h-5 w-5" />
            Menú
          </button>
        </div>
      </nav>

      {/* Menú deslizable con todos los enlaces (móvil y tablet). */}
      {menuAbierto && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto bg-white p-4 shadow-xl dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Menú</p>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {itemsNav.map((item) => (
              <EnlaceNav
                key={item.href}
                item={item}
                activo={esActivo(pathname, item.href)}
                alClick={() => setMenuAbierto(false)}
              />
            ))}
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Tema</span>
                <TemaToggle />
              </div>
              {usuario ? (
                <div className="mt-3 space-y-2 px-1">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {usuario.nombre} · {usuario.rol}
                  </p>
                  <form action={cerrarSesion}>
                    <button
                      type="submit"
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              ) : authActiva ? (
                <Link
                  href="/login"
                  onClick={() => setMenuAbierto(false)}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </Link>
              ) : (
                <p className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
                  Aún no hay usuarios: la app está abierta. Crea el primer usuario en
                  Usuarios.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
