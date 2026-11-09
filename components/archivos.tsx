import Image from 'next/image';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormularioEliminarArchivo, FormularioSubidaArchivo } from '@/components/formulario-archivo';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { MAX_ARCHIVO_BYTES, isR2Configured } from '@/lib/r2';

export type EntidadArchivoUI = 'RECETA' | 'LOTE' | 'INSUMO' | 'VENTA';

export type ArchivoListado = {
  id: string;
  nombreOriginal: string;
  url: string;
  tipoMime: string;
  tamano: number;
  entidad: EntidadArchivoUI;
  entidadId: string;
  createdAt: Date;
};

export async function obtenerArchivos(
  entidad?: EntidadArchivoUI,
  entidadId?: string
): Promise<ArchivoListado[]> {
  if (!isDbConfigured()) {
    return [];
  }
  try {
    return await prisma.archivo.findMany({
      where: {
        ...(entidad ? { entidad } : {}),
        ...(entidadId ? { entidadId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  } catch (error) {
    console.error('obtenerArchivos: sin acceso a la base de datos', error);
    return [];
  }
}

function formatoTamano(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function esImagen(tipoMime: string): boolean {
  return tipoMime.startsWith('image/');
}

/**
 * Lista los archivos de una entidad con su enlace de descarga y la acción
 * para eliminarlos, más el formulario de subida (imágenes y PDF, máx. 4 MB).
 * Sin R2 configurado muestra el aviso y desactiva la subida, sin romper.
 * La subida y el borrado usan componentes cliente con useFormState para
 * que el éxito o el error se vean en la página (antes un fallo rompía
 * toda la página con el error boundary y parecía que el botón no hacía nada).
 */
export async function ArchivosEntidad({
  entidad,
  entidadId,
  titulo = 'Archivos',
  descripcion = 'Fotos y documentos guardados en Cloudflare R2.',
}: {
  entidad: EntidadArchivoUI;
  entidadId: string;
  titulo?: string;
  descripcion?: string;
}) {
  const archivos = await obtenerArchivos(entidad, entidadId);
  const r2Listo = isR2Configured();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormularioSubidaArchivo
          entidad={entidad}
          entidadId={entidadId}
          r2Listo={r2Listo}
          maxBytes={MAX_ARCHIVO_BYTES}
        />

        {archivos.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aún no hay archivos para esta entidad.
          </p>
        ) : (
          <ul className="space-y-2">
            {archivos.map((archivo) => (
              <li
                key={archivo.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm"
              >
                {esImagen(archivo.tipoMime) ? (
                  <Link href={archivo.url} target="_blank" rel="noreferrer">
                    <Image
                      src={archivo.url}
                      alt={archivo.nombreOriginal}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-md object-cover"
                      unoptimized
                    />
                  </Link>
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                    PDF
                  </span>
                )}
                <div className="min-w-40 flex-1">
                  <Link
                    href={archivo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 dark:text-emerald-400 underline"
                  >
                    {archivo.nombreOriginal}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {archivo.tipoMime} · {formatoTamano(archivo.tamano)} ·{' '}
                    {new Date(archivo.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <FormularioEliminarArchivo
                  archivoId={archivo.id}
                  entidad={entidad}
                  entidadId={entidadId}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Imagen principal de una entidad: la primera imagen subida, si existe. */
export async function ImagenPrincipal({
  entidad,
  entidadId,
  alt,
}: {
  entidad: EntidadArchivoUI;
  entidadId: string;
  alt: string;
}) {
  const archivos = await obtenerArchivos(entidad, entidadId);
  // obtenerArchivos ordena por fecha descendente: la última imagen de la
  // lista es la primera que se subió, y esa es la foto principal.
  const imagenes = archivos.filter((a) => esImagen(a.tipoMime));
  const imagen = imagenes[imagenes.length - 1];
  if (!imagen) {
    return null;
  }
  return (
    <Link href={imagen.url} target="_blank" rel="noreferrer" className="block">
      <Image
        src={imagen.url}
        alt={alt}
        width={640}
        height={360}
        className="h-56 w-full rounded-xl border border-slate-200 dark:border-slate-800 object-cover sm:h-64"
        unoptimized
      />
    </Link>
  );
}
