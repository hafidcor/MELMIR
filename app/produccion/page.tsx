import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { R2Warning } from '@/components/r2-warning';
import { ArchivosEntidad } from '@/components/archivos';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { crearLote, completarLoteForm } from '@/app/actions/produccion';

export const dynamic = 'force-dynamic';

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500';

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams?: { estado?: string };
}) {
  const ESTADOS = ['PENDIENTE', 'EN_PRODUCCION', 'COMPLETADO', 'CANCELADO'] as const;
  const estadoFiltro = ESTADOS.includes(searchParams?.estado as (typeof ESTADOS)[number])
    ? (searchParams!.estado as (typeof ESTADOS)[number])
    : null;
  let recetas: Array<{ id: string; nombre: string }> = [];
  let lotes: Array<{
    id: string;
    codigoLote: string;
    estado: string;
    botellasEsperadas: number;
    botellasReales: number;
    costoTotalLote: unknown;
    costoUnitarioPieza: unknown;
    receta: { nombre: string };
  }> = [];

  if (isDbConfigured()) {
    try {
      recetas = await prisma.receta.findMany({
        orderBy: { nombre: 'asc' },
      });
      lotes = await prisma.loteProduccion.findMany({
        where: estadoFiltro ? { estado: estadoFiltro } : undefined,
        include: { receta: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('ProduccionPage: sin acceso a la base de datos', error);
      recetas = [];
      lotes = [];
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-3xl font-bold">Producción</h1>
          </div>
          <Link href="#nueva-orden">
            <Button>Crear orden de producción</Button>
          </Link>
        </header>

        <Card id="nueva-orden">
          <CardHeader>
            <CardTitle>Nueva orden de trabajo</CardTitle>
            <CardDescription>Genera un lote de producción a partir de una receta activa</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearLote} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Receta</label>
                <select
                  name="recetaId"
                  className={selectClass}
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Selecciona una receta
                  </option>
                  {recetas.map((receta) => (
                    <option key={receta.id} value={receta.id}>
                      {receta.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Botellas esperadas</label>
                <Input name="botellasEsperadas" type="number" placeholder="120" required />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <Button type="submit">Crear lote</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes de producción</CardTitle>
            <CardDescription>
              Estado operativo y rendimiento real
              {estadoFiltro ? ` · mostrando solo lotes ${estadoFiltro}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Link href="/produccion">
                <Button type="button" variant={estadoFiltro ? 'outline' : 'default'} size="sm">
                  Todos
                </Button>
              </Link>
              {ESTADOS.map((estado) => (
                <Link key={estado} href={`/produccion?estado=${estado}`}>
                  <Button
                    type="button"
                    variant={estadoFiltro === estado ? 'default' : 'outline'}
                    size="sm"
                  >
                    {estado.replace('_', ' ')}
                  </Button>
                </Link>
              ))}
            </div>
            {lotes.length === 0 ? (
              <p className="text-sm text-slate-500">
                {estadoFiltro
                  ? `No hay lotes en estado ${estadoFiltro}.`
                  : 'Aún no hay lotes registrados. Crea la primera orden de trabajo con el formulario de arriba.'}
              </p>
            ) : (
              <div className="space-y-4">
                {lotes.map((lote) => {
                  const abierto = lote.estado === 'PENDIENTE' || lote.estado === 'EN_PRODUCCION';
                  return (
                    <div key={lote.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{lote.codigoLote}</p>
                          <p className="text-sm text-slate-500">{lote.receta.nombre}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          {lote.estado}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase text-slate-500">Esperadas</p>
                          <p className="font-semibold">{lote.botellasEsperadas}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500">Reales</p>
                          <p className="font-semibold">{lote.botellasReales}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500">Coste lote</p>
                          <p className="font-semibold">${Number(lote.costoTotalLote ?? 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500">Costo / pieza</p>
                          <p className="font-semibold">${Number(lote.costoUnitarioPieza ?? 0).toFixed(2)}</p>
                        </div>
                      </div>

                      {abierto ? (
                        <form
                          action={completarLoteForm}
                          className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
                        >
                          <input type="hidden" name="loteId" value={lote.id} />
                          <div className="w-44">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Botellas reales
                            </label>
                            <Input
                              name="botellasReales"
                              type="number"
                              min="1"
                              placeholder={String(lote.botellasEsperadas)}
                              required
                            />
                          </div>
                          <Button type="submit" size="sm">
                            Completar lote
                          </Button>
                          <p className="w-full text-xs text-slate-500">
                            Al completar el lote se descuentan los insumos de la receta y se
                            registra el producto terminado. Si falta stock, el cierre se rechaza.
                          </p>
                        </form>
                      ) : (
                        <p className="mt-4 border-t pt-4 text-sm text-slate-500">
                          Lote {lote.estado === 'COMPLETADO' ? 'completado' : lote.estado.toLowerCase()}{' '}
                          con {lote.botellasReales} botellas reales. Ver detalle en{' '}
                          <Link href="/historial" className="font-medium text-emerald-700 underline">
                            Historial
                          </Link>
                          .
                        </p>
                      )}

                      <div className="mt-4">
                        <ArchivosEntidad
                          entidad="LOTE"
                          entidadId={lote.id}
                          titulo="Fotos y documentos del lote"
                          descripcion="Fotos del proceso, certificados o documentos del lote, guardados en Cloudflare R2."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
