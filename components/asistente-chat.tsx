'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { preguntarAsistente } from '@/app/actions/asistente';

type Mensaje = { rol: 'usuario' | 'asistente'; texto: string };

/** Preguntas rápidas: las mismas que entiende el asistente. */
const PREGUNTAS_RAPIDAS = [
  'Resumen de hoy',
  '¿Qué vence esta semana?',
  'Problemas abiertos',
  '¿Cómo va el lote LT-001?',
  '¿Qué me recomiendas?',
  '¿Qué insumos me faltan?',
];

/**
 * Chat del asistente MELMIR. El historial vive solo en el estado del
 * cliente (sesión del navegador): nada se guarda en la base de datos.
 * Las preguntas van a la server action preguntarAsistente, que solo
 * lee datos reales y nunca modifica nada.
 *
 * `compacto` es la variante para la burbuja flotante: sin Card, con
 * altura flexible para llenar el panel (el historial crece y el campo
 * de texto queda abajo). Sin `compacto` es la versión de página, con
 * Card y altura máxima propia.
 */
export function AsistenteChat({
  resumenInicial,
  compacto = false,
}: {
  resumenInicial: string;
  compacto?: boolean;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { rol: 'asistente', texto: resumenInicial },
  ]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes, enviando]);

  async function enviar(pregunta: string) {
    const preguntaLimpia = pregunta.trim();
    if (!preguntaLimpia || enviando) return;
    setMensajes((m) => [...m, { rol: 'usuario', texto: preguntaLimpia }]);
    setTexto('');
    setEnviando(true);
    try {
      const respuesta = await preguntarAsistente(preguntaLimpia);
      setMensajes((m) => [...m, { rol: 'asistente', texto: respuesta }]);
    } catch {
      setMensajes((m) => [
        ...m,
        { rol: 'asistente', texto: 'No pude responder ahora. Inténtalo de nuevo en un momento.' },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return compacto ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pb-2 pt-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pregúntame por tus lotes, vencimientos, problemas, stock y ventas. Respondo con los
          datos reales de la app, sin inventar nada.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
        {/* Historial del chat (solo en esta sesión del navegador). */}
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3 dark:bg-slate-900"
          aria-live="polite"
        >
          {mensajes.map((mensaje, i) => (
            <div
              key={i}
              className={`flex ${mensaje.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] whitespace-pre-line rounded-xl px-4 py-2 text-sm leading-relaxed ${
                  mensaje.rol === 'usuario'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {mensaje.texto}
              </div>
            </div>
          ))}
          {enviando && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                Pensando…
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {/* Preguntas rápidas (chips). */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {PREGUNTAS_RAPIDAS.map((pregunta) => (
            <button
              key={pregunta}
              type="button"
              onClick={() => enviar(pregunta)}
              disabled={enviando}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
            >
              {pregunta}
            </button>
          ))}
        </div>

        {/* Campo de texto para preguntar. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="flex shrink-0 gap-2"
        >
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta…"
            aria-label="Pregunta al asistente"
            disabled={enviando}
            autoComplete="off"
          />
          <Button type="submit" disabled={enviando || texto.trim().length === 0}>
            {enviando ? '…' : 'Enviar'}
          </Button>
        </form>
        <p className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
          Solo consulta datos: no crea, edita ni borra nada. El historial se borra al salir de
          la app.
        </p>
      </div>
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Asistente MELMIR</CardTitle>
        <CardDescription>
          Pregúntame por tus lotes, vencimientos, problemas, stock y ventas. Respondo con los
          datos reales de la app, sin inventar nada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Historial del chat (solo en esta sesión del navegador). */}
        <div
          className="max-h-[60vh] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3 dark:bg-slate-900"
          aria-live="polite"
        >
          {mensajes.map((mensaje, i) => (
            <div
              key={i}
              className={`flex ${mensaje.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] whitespace-pre-line rounded-xl px-4 py-2 text-sm leading-relaxed ${
                  mensaje.rol === 'usuario'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {mensaje.texto}
              </div>
            </div>
          ))}
          {enviando && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                Pensando…
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {/* Preguntas rápidas (chips). */}
        <div className="flex flex-wrap gap-2">
          {PREGUNTAS_RAPIDAS.map((pregunta) => (
            <button
              key={pregunta}
              type="button"
              onClick={() => enviar(pregunta)}
              disabled={enviando}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
            >
              {pregunta}
            </button>
          ))}
        </div>

        {/* Campo de texto para preguntar. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="flex gap-2"
        >
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta… por ejemplo: ¿qué vence hoy?"
            aria-label="Pregunta al asistente"
            disabled={enviando}
            autoComplete="off"
          />
          <Button type="submit" disabled={enviando || texto.trim().length === 0}>
            {enviando ? '…' : 'Enviar'}
          </Button>
        </form>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          El asistente solo consulta datos: no crea, edita ni borra lotes, ventas ni notas. El
          historial se borra al salir de la página.
        </p>
      </CardContent>
    </Card>
  );
}
