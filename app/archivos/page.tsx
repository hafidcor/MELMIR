import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DbWarning } from '@/components/db-warning';
import { R2Warning } from '@/components/r2-warning';
import { obtenerArchivos } from '@/components/archivos';
import { eliminarArchivo } from '@/app/actions/archivos';

export const dynamic = 'force-dynamic';

const ENTIDADES = ['RECETA', 'LOTE', 'INSUMO', 'VENTA'] as const;

const ETIQUETAS: Record<string, string> = {
  RECETA: 'Receta',
  LOTE: 'Lote',
  INSUMO: 'Insumo',
  VENTA: 'Venta',
};

function formatoTamano(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Listado general de todos los archivos guardados en Cloudflare R2,
 * con filtro por entidad, enlace para abrir/descargar y eliminación.
 * Sin base de datos o sin R2 muestra estados vacíos y avisos, sin romper.
 */
export default async function ArchivosPage({
  searchParams,
}: {
  searchParams?: { entidad?: string };
}) {
  const filtro = ENTIDADES.includes(searchParams?.entidad as (typeof ENTIDADES)[number])
    ? (searchParams!.entidad as (typeof ENTIDADES)[number])
    : null;
  const archivos = await obtenerArchivos(filtro ?? undefined);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Archivos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fotos y documentos guardados en Cloudflare R2, de recetas, lotes,
            insumos y ventas.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Todos los archivos</CardTitle>
            <CardDescription>
              {archivos.length === 0
                ? 'Aún no hay archivos guardados.'
                : `${archivos.length} archivo(s) guardado(s)`}
              {filtro ? ` · mostrando solo ${ETIQUETAS[filtro]}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link href="/archivos">
                <Button type="button" variant={filtro ? 'outline' : 'default'} size="sm">
                  Todos
                </Button>
              </Link>
              {ENTIDADES.map((entidad) => (
                <Link key={entidad} href={`/archivos?entidad=${entidad}`}>
                  <Button
                    type="button"
                    variant={filtro === entidad ? 'default' : 'outline'}
                    size="sm"
                  >
                    {ETIQUETAS[entidad]}
                  </Button>
                </Link>
              ))}
            </div>

            {archivos.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sube fotos o documentos desde una receta, un lote, un insumo o
                una venta: aparecen aquí y en su entidad.
              </p>
            ) : (
              <ul className="space-y-2">
                {archivos.map((archivo) => (
                  <li
                    key={archivo.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    {archivo.tipoMime.startsWith('image/') ? (
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
                      <span className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                        PDF
                      </span>
                    )}
                    <div className="min-w-40 flex-1">
                      <Link
                        href={archivo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-emerald-700 underline"
                      >
                        {archivo.nombreOriginal}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {ETIQUETAS[archivo.entidad] ?? archivo.entidad} ·{' '}
                        {archivo.tipoMime} · {formatoTamano(archivo.tamano)} ·{' '}
                        {new Date(archivo.createdAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <form action={eliminarArchivo}>
                      <input type="hidden" name="archivoId" value={archivo.id} />
                      <input type="hidden" name="entidad" value={archivo.entidad} />
                      <input type="hidden" name="entidadId" value={archivo.entidadId} />
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
      </div>
    </main>
  );
}
