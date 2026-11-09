'use client';

import { eliminarRespaldo } from '@/app/actions/respaldo';

/** Formulario de borrado de un respaldo con confirmación en el navegador. */
export function FormularioEliminarRespaldo({ clave }: { clave: string }) {
  return (
    <form
      action={eliminarRespaldo}
      onSubmit={(evento) => {
        if (
          !window.confirm(
            '¿Eliminar este respaldo? Esta acción no se puede deshacer.'
          )
        ) {
          evento.preventDefault();
        }
      }}
    >
      <input type="hidden" name="clave" value={clave} />
      <button
        type="submit"
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Eliminar
      </button>
    </form>
  );
}
