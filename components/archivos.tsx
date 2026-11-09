import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { isR2Configured } from '@/lib/r2';
import { eliminarArchivo, subirArchivo } from '@/app/actions/archivos';

export type EntidadArchivoUI = 'RECETA' | 'LOTE' | 'INSUMO' | 'VENTA';

export type ArchivoListado = {
  id: string;
  nombreOriginal: string;
  url: string;
  tipoMime: string;
  tamano: number;
  entidad: string;
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
 * para eliminarlos, más el formulario de subida (imágenes y PDF, máx. 5 MB).
 * Sin R2 configurado muestra el aviso y desactiva la subida, sin romper.
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
        <form
          action={subirArchivo}
          encType="multipart/form-data"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3"
        >
          <input type="hidden" name="entidad" value={entidad} />
          <input type="hidden" name="entidadId" value={entidadId} />
          <div className="min-w-52 flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Subir archivo
            </label>
            <input
              type="file"
              name="archivo"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              disabled={!r2Listo}
              required
              className="block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Imágenes (JPEG, PNG, WebP, GIF) y PDF, máximo 5 MB por archivo.
            </p>
          </div>
          <Button type="submit" size="sm" disabled={!r2Listo}>
            Subir a R2
          </Button>
        </form>

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
                <form action={eliminarArchivo}>
                  <input type="hidden" name="archivoId" value={archivo.id} />
                  <input type="hidden" name="entidad" value={entidad} />
                  <input type="hidden" name="entidadId" value={entidadId} />
                  <Button type="submit" variant="outline" size="sm">
                    Eliminar
                  </Button>
                </form>
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
  const imagen = archivos.find((a) => esImagen(a.tipoMime));
  if (!imagen) {
    return null;
  }
  return (
    <Link href={imagen.url} target="_blank" rel="noreferrer">
      <Image
        src={imagen.url}
        alt={alt}
        width={320}
        height={200}
        className="h-48 w-full rounded-xl object-cover"
        unoptimized
      />
    </Link>
  );
}
