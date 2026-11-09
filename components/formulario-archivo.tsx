'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  eliminarArchivo,
  subirArchivo,
  type EstadoArchivo,
} from '@/app/actions/archivos';

// Tipos aceptados: mantener sincronizado con TIPOS_PERMITIDOS en lib/r2.ts.
const TIPOS_ACEPTADOS =
  'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const TIPOS_ACEPTADOS_SET = new Set(TIPOS_ACEPTADOS.split(','));

function BotonSubir({ deshabilitado }: { deshabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={deshabilitado || pending}>
      {pending ? 'Subiendo…' : 'Subir a R2'}
    </Button>
  );
}

function BotonEliminar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Eliminando…' : 'Eliminar'}
    </Button>
  );
}

/**
 * Formulario de subida a Cloudflare R2 con retroalimentación visible:
 * - Valida tipo y tamaño ANTES de enviar (sin eso, un archivo mayor de
 *   ~4.5 MB lo rechaza Vercel con 413 antes de llegar al servidor y el
 *   usuario no ve por qué).
 * - El resultado de la acción se muestra en la página (éxito o error),
 *   en lugar de romper toda la página con el error boundary.
 */
export function FormularioSubidaArchivo({
  entidad,
  entidadId,
  opcionesEntidadId,
  r2Listo,
  maxBytes,
}: {
  entidad: 'RECETA' | 'LOTE' | 'INSUMO' | 'VENTA';
  entidadId?: string;
  opcionesEntidadId?: Array<{ id: string; etiqueta: string }>;
  r2Listo: boolean;
  maxBytes: number;
}) {
  const [estado, accion] = useFormState<EstadoArchivo, FormData>(subirArchivo, {
    ok: false,
  });
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);

  // Al subir bien, limpia el formulario para poder subir otro archivo.
  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset();
      setNombreArchivo(null);
      setErrorLocal(null);
    }
  }, [estado.ok]);

  function alElegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) {
      setNombreArchivo(null);
      setErrorLocal(null);
      return;
    }
    if (!TIPOS_ACEPTADOS_SET.has(archivo.type)) {
      setErrorLocal(
        'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF) y PDF.'
      );
      evento.target.value = '';
      setNombreArchivo(null);
      return;
    }
    if (archivo.size > maxBytes) {
      setErrorLocal(
        `El archivo pesa ${(archivo.size / (1024 * 1024)).toFixed(1)} MB y supera el máximo de ${maxMB} MB.`
      );
      evento.target.value = '';
      setNombreArchivo(null);
      return;
    }
    setErrorLocal(null);
    setNombreArchivo(archivo.name);
  }

  return (
    <form
      ref={formRef}
      action={accion}
      encType="multipart/form-data"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3"
    >
      <input type="hidden" name="entidad" value={entidad} />
      {opcionesEntidadId ? (
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Entidad
          </label>
          <select
            name="entidadId"
            defaultValue=""
            required
            disabled={!r2Listo}
            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100"
          >
            <option value="" disabled>
              Selecciona
            </option>
            {opcionesEntidadId.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="entidadId" value={entidadId ?? ''} />
      )}
      <div className="min-w-52 flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Subir archivo
        </label>
        <input
          type="file"
          name="archivo"
          accept={TIPOS_ACEPTADOS}
          disabled={!r2Listo}
          required
          onChange={alElegirArchivo}
          className="block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Imágenes (JPEG, PNG, WebP, GIF) y PDF, máximo {maxMB} MB por archivo.
          {nombreArchivo ? ` · Elegido: ${nombreArchivo}` : ''}
        </p>
      </div>
      <BotonSubir deshabilitado={!r2Listo || errorLocal !== null} />
      <div className="w-full">
        {!r2Listo && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Configura Cloudflare R2 en Vercel para subir archivos.
          </p>
        )}
        {errorLocal && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorLocal}
          </p>
        )}
        {estado.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {estado.error}
          </p>
        )}
        {estado.ok && estado.exito && (
          <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            ✓ {estado.exito}
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * Borrado de un archivo con retroalimentación visible: si falla (por
 * ejemplo, sin permiso o sin base de datos), el error se muestra junto
 * al botón en lugar de romper toda la página.
 */
export function FormularioEliminarArchivo({
  archivoId,
  entidad,
  entidadId,
}: {
  archivoId: string;
  entidad: 'RECETA' | 'LOTE' | 'INSUMO' | 'VENTA';
  entidadId: string;
}) {
  const [estado, accion] = useFormState<EstadoArchivo, FormData>(eliminarArchivo, {
    ok: false,
  });

  return (
    <form action={accion} className="flex flex-col items-start gap-1">
      <input type="hidden" name="archivoId" value={archivoId} />
      <input type="hidden" name="entidad" value={entidad} />
      <input type="hidden" name="entidadId" value={entidadId} />
      <BotonEliminar />
      {estado.error && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {estado.error}
        </p>
      )}
    </form>
  );
}
