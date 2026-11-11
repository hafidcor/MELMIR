import { DbWarning } from '@/components/db-warning';
import { AsistenteChat } from '@/components/asistente-chat';
import { obtenerResumenHoy } from '@/app/actions/asistente';

export const dynamic = 'force-dynamic';

/**
 * Asistente MELMIR: chat de seguimiento por reglas sobre los datos
 * reales. Al abrir, ya muestra el resumen de hoy generado por el
 * mismo motor que usa el Dashboard. El historial del chat vive solo
 * en la sesión del navegador.
 */
export default async function AsistentePage() {
  const { resumen } = await obtenerResumenHoy();

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            MELMIR
          </p>
          <h1 className="mt-2 text-3xl font-bold">Asistente</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pregúntame por tus lotes y te respondo con los datos reales de la app.
          </p>
        </header>

        <AsistenteChat resumenInicial={resumen} />
      </div>
    </main>
  );
}
