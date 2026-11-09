import { isDbConfigured } from '@/lib/prisma';

/**
 * Aviso visible cuando no hay base de datos configurada.
 * Se muestra en las páginas que leen de Prisma; no lanza errores.
 */
export function DbWarning() {
  if (isDbConfigured()) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-4 text-sm text-amber-900 dark:text-amber-200">
      <p className="font-semibold">Sin conexión a la base de datos</p>
      <p className="mt-1">
        Configura DATABASE_URL en Vercel para ver tus datos reales. Mientras tanto, la
        aplicación muestra estados vacíos.
      </p>
    </div>
  );
}
