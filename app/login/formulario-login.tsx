'use client';

import { useFormState } from 'react-dom';
import { iniciarSesion } from '@/app/actions/auth';

const inputClass =
  'flex h-12 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function FormularioLogin({ next }: { next: string }) {
  const [state, formAction] = useFormState(iniciarSesion, { error: undefined });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="contrasena"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Tu contraseña"
          className={inputClass}
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        className="h-12 w-full rounded-md bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700"
      >
        Iniciar sesión
      </button>
    </form>
  );
}
