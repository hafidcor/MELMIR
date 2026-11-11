'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, X } from 'lucide-react';

import { AsistenteChat } from '@/components/asistente-chat';
import { obtenerResumenHoy } from '@/app/actions/asistente';

/** Evento de ventana para abrir la burbuja desde cualquier lugar
    (por ejemplo, el botón «Preguntar» de la tarjeta del Dashboard). */
export const EVENTO_ABRIR_ASISTENTE = 'melmir:abrir-asistente';

/**
 * Burbuja flotante del asistente MELMIR, presente en todas las
 * páginas internas del ERP. Al tocarla abre un panel de chat con el
 * mismo AsistenteChat de siempre (resumen de hoy al abrir, chips de
 * preguntas rápidas y campo de texto). El chat solo se monta cuando
 * se abre por primera vez —no carga el resumen en cada cambio de
 * página— y una vez montado se conserva la conversación de la sesión
 * al cerrar y volver a abrir.
 *
 * No aparece en /login (mismo mecanismo que la navegación) ni en la
 * ficha pública /hidromiel (el layout no monta este componente ahí).
 * En móvil queda por encima de la barra inferior (bottom-20) y el
 * panel es casi a pantalla completa; en escritorio es un panel de
 * 380 px abajo a la derecha.
 */
export function BurbujaAsistente() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState<string | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  // La tarjeta del Dashboard puede abrir la burbuja con este evento.
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_ASISTENTE, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_ASISTENTE, abrir);
  }, []);

  // El resumen de hoy solo se pide la primera vez que se abre el chat.
  useEffect(() => {
    if (!abierto || resumen !== null || cargandoResumen) return;
    setCargandoResumen(true);
    obtenerResumenHoy()
      .then(({ resumen: texto }) => setResumen(texto))
      .catch(() =>
        setResumen(
          'No pude cargar el resumen de hoy. Pregúntame por tus lotes y te respondo con los datos reales.'
        )
      )
      .finally(() => setCargandoResumen(false));
  }, [abierto, resumen, cargandoResumen]);

  if (pathname === '/login' || pathname === '/asistente') return null;

  return (
    <>
      {/* Botón flotante: en móvil va más arriba para no tapar la barra
          inferior; en escritorio queda abajo a la derecha. */}
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
        title={abierto ? 'Cerrar asistente' : 'Pregúntale al asistente'}
        className="fixed bottom-20 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 md:bottom-6 md:right-6"
      >
        {abierto ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Panel de chat: se mantiene montado tras la primera apertura
          para conservar la conversación; solo se oculta al cerrar. */}
      {resumen !== null && (
        <div
          role="dialog"
          aria-label="Asistente MELMIR"
          className={`fixed inset-x-3 bottom-[6.5rem] top-16 z-[70] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 md:inset-x-auto md:bottom-24 md:right-6 md:top-auto md:h-[600px] md:max-h-[calc(100vh-8rem)] md:w-[380px] ${
            abierto ? '' : 'hidden'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Asistente MELMIR
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <AsistenteChat resumenInicial={resumen} compacto />
          </div>
        </div>
      )}

      {/* Mientras carga el resumen de hoy, el panel muestra un aviso. */}
      {abierto && resumen === null && (
        <div
          role="dialog"
          aria-label="Asistente MELMIR"
          className="fixed inset-x-3 bottom-[6.5rem] top-16 z-[70] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 md:inset-x-auto md:bottom-24 md:right-6 md:top-auto md:h-[600px] md:max-h-[calc(100vh-8rem)] md:w-[380px]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Asistente MELMIR
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Cargando el resumen de hoy…
          </p>
        </div>
      )}
    </>
  );
}
