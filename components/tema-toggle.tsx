'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Interruptor claro/oscuro. La clase 'dark' en <html> la pone el script
 * anti-parpadeo de app/layout.tsx antes de pintar; aquí solo se lee y
 * se cambia, guardando la preferencia en localStorage ('melmir-tema').
 */
export function TemaToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains('dark'));
  }, []);

  const cambiar = () => {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    document.documentElement.classList.toggle('dark', nuevo);
    try {
      localStorage.setItem('melmir-tema', nuevo ? 'oscuro' : 'claro');
    } catch {
      // Sin acceso a localStorage, el tema solo dura esta visita.
    }
  };

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={oscuro ? 'Tema claro' : 'Tema oscuro'}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {oscuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
