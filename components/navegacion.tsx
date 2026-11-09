'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
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
} from 'lucide-react';

import { TemaToggle } from '@/components/tema-toggle';
import { cerrarSesion } from '@/app/actions/auth';

type NavItem = {
  href: string;
  label: string;
  icono: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icono: Home },
  { href: '/dashboard', label: 'Dashboard', icono: LayoutDashboard },
  { href: '/insumos', label: 'Insumos', icono: Package },
  { href: '/recetas', label: 'Recetas', icono: BookOpen },
  { href: '/produccion', label: 'Producción', icono: Factory },
  { href: '/precios', label: 'Precios', icono: Tag },
  { href: '/ventas', label: 'Ventas', icono: ShoppingCart },
  { href: '/archivos', label: 'Archivos', icono: FolderOpen },
  { href: '/historial', label: 'Historial', icono: History },
  { href: '/usuarios', label: 'Usuarios', icono: Users },
  { href: '/respaldo', label: 'Respaldos', icono: DatabaseBackup },
];

// Barra inferior móvil: los 4 destinos más usados + el menú completo.
const BARRA_MOVIL: NavItem[] = [
  { href: '/', label: 'Inicio', icono: Home },
  { href: '/produccion', label: 'Producción', icono: Factory },
  { href: '/ventas', label: 'Ventas', icono: ShoppingCart },
  { href: '/archivos', label: 'Archivos', icono: FolderOpen },
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
    </Link>
  );
}

export function Navegacion({
  usuario,
  authActiva,
}: {
  usuario: { nombre: string; rol: string } | null;
  authActiva: boolean;
}) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
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

          <div className="flex items-center gap-2">
            <TemaToggle />
            {usuario ? (
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
            ) : authActiva ? (
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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navegación de escritorio: todos los enlaces con estado activo. */}
        <nav className="mx-auto hidden max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6 md:flex lg:px-8">
          {NAV_ITEMS.map((item) => (
            <EnlaceNav key={item.href} item={item} activo={esActivo(pathname, item.href)} />
          ))}
        </nav>
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

      {/* Menú deslizable con todos los enlaces (móvil y escritorio). */}
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
            {NAV_ITEMS.map((item) => (
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
