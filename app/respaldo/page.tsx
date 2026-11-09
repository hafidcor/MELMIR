import { redirect } from 'next/navigation';

import { hayUsuarios, obtenerSesion } from '@/lib/auth';
import { isDbConfigured } from '@/lib/prisma';
import { isR2Configured } from '@/lib/r2';
import {
  crearRespaldo,
  listarRespaldos,
} from '@/app/actions/respaldo';
import { FormularioEliminarRespaldo } from './formulario-eliminar';

export const dynamic = 'force-dynamic';

function formatoTamano(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function formatoFecha(fecha: Date | null): string {
  if (!fecha) {
    return 'Fecha desconocida';
  }
  return new Date(fecha).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function urlDescarga(clave: string): string {
  return `/api/respaldos/${clave.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Respaldo de la base de datos en Cloudflare R2. Solo ADMIN.
 * En modo abierto (aún no hay usuarios) se permite el acceso con un aviso.
 */
export default async function RespaldoPage() {
  const modoAbierto = !(await hayUsuarios());
  const sesion = await obtenerSesion();

  if (!modoAbierto && (!sesion || sesion.rol !== 'ADMIN')) {
    redirect('/login');
  }

  const dbConfigurada = isDbConfigured();
  const r2Configurado = isR2Configured();
  const respaldos = await listarRespaldos();
  const puedeCrear = dbConfigurada && r2Configurado;

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            MELMIR
          </p>
          <h1 className="mt-2 text-3xl font-bold">Respaldo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Copia de seguridad completa de la base de datos, guardada como
            archivo JSON en Cloudflare R2.
          </p>
        </header>

        {modoAbierto && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-semibold">Modo abierto</p>
            <p className="mt-1">
              Aún no hay usuarios creados: cualquiera con acceso a la
              aplicación puede crear y descargar respaldos. Crea un usuario
              administrador para restringir esta sección.
            </p>
          </div>
        )}

        {!dbConfigurada && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-semibold">Sin conexión a la base de datos</p>
            <p className="mt-1">
              Configura DATABASE_URL en Vercel para crear respaldos.
            </p>
          </div>
        )}

        {!r2Configurado && (
          <div className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
            <p className="font-semibold">Cloudflare R2 no configurado</p>
            <p className="mt-1">
              Configura Cloudflare R2 en Vercel (R2_ACCOUNT_ID,
              R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET_NAME) para
              guardar respaldos.
            </p>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Crear respaldo</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            El respaldo incluye todos los insumos, recetas, movimientos,
            lotes, productos terminados, ventas, archivos registrados y
            usuarios. <strong>Nunca incluye contraseñas.</strong> La
            restauración es manual: descarga el archivo JSON y vuelve a cargar
            sus datos cuando lo necesites.
          </p>
          {puedeCrear ? (
            <form action={crearRespaldo} className="mt-4">
              <button
                type="submit"
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                Crear respaldo
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Para crear un respaldo primero configura la base de datos y
              Cloudflare R2.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Respaldos guardados</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {respaldos.length === 0
              ? 'Aún no hay respaldos guardados.'
              : `${respaldos.length} respaldo(s) guardado(s) en Cloudflare R2`}
          </p>

          {respaldos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {respaldos.map((respaldo) => (
                <li
                  key={respaldo.clave}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">
                      {respaldo.clave.split('/').pop()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatoFecha(respaldo.fecha)} ·{' '}
                      {formatoTamano(respaldo.tamano)}
                    </p>
                  </div>
                  <a
                    href={urlDescarga(respaldo.clave)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-slate-800"
                  >
                    Descargar
                  </a>
                  <FormularioEliminarRespaldo clave={respaldo.clave} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
