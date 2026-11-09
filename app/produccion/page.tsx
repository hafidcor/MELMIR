import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { R2Warning } from '@/components/r2-warning';
import { ArchivosEntidad } from '@/components/archivos';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { crearLote } from '@/app/actions/produccion';
import { crearEtapasLote, actualizarEtapa } from '@/app/actions/etapas';
import CompletarLoteForm from '@/components/completar-lote-form';

export const dynamic = 'force-dynamic';

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

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
    receta: {
      id: string;
      nombre: string;
      recetaInsumos: Array<{
        cantidadConsumida: unknown;
        insumo: {
          id: string;
          nombre: string;
          unidadMedida: string;
          costoUnitario: unknown;
          stockActual: unknown;
        };
      }>;
    };
    etapas: Array<{
      id: string;
      nombre: string;
      orden: number;
      estado: string;
      fechaPlaneada: Date | null;
      fechaReal: Date | null;
    }>;
    movimientos: Array<{
      id: string;
      cantidad: unknown;
      costoUnitario: unknown;
      total: unknown;
      insumo: { nombre: string; unidadMedida: string };
    }>;
    costosAdicionales: Array<{ id: string; concepto: string; monto: unknown }>;
  }> = [];

  if (isDbConfigured()) {
    try {
      recetas = await prisma.receta.findMany({
        orderBy: { nombre: 'asc' },
      });
      lotes = await prisma.loteProduccion.findMany({
        where: estadoFiltro ? { estado: estadoFiltro } : undefined,
        include: {
          receta: { include: { recetaInsumos: { include: { insumo: true } } } },
          etapas: { orderBy: { orden: 'asc' } },
          movimientos: {
            where: { tipo: 'PRODUCCION_CONSUMO' },
            include: { insumo: true },
            orderBy: { createdAt: 'asc' },
          },
          costosAdicionales: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('ProduccionPage: sin acceso a la base de datos', error);
      recetas = [];
      lotes = [];
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Receta</label>
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Botellas esperadas</label>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {estadoFiltro
                  ? `No hay lotes en estado ${estadoFiltro}.`
                  : 'Aún no hay lotes registrados. Crea la primera orden de trabajo con el formulario de arriba.'}
              </p>
            ) : (
              <div className="space-y-4">
                {lotes.map((lote) => {
                  const abierto = lote.estado === 'PENDIENTE' || lote.estado === 'EN_PRODUCCION';
                  return (
                    <div key={lote.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{lote.codigoLote}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{lote.receta.nombre}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          {lote.estado}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Esperadas</p>
                          <p className="font-semibold">{lote.botellasEsperadas}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Reales</p>
                          <p className="font-semibold">{lote.botellasReales}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo real del lote</p>
                          <p className="font-semibold">
                            {Number(lote.costoTotalLote ?? 0) > 0
                              ? `$${Number(lote.costoTotalLote).toFixed(2)}`
                              : 'sin datos de costo'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo real / botella</p>
                          <p className="font-semibold">
                            {Number(lote.costoUnitarioPieza ?? 0) > 0
                              ? `$${Number(lote.costoUnitarioPieza).toFixed(2)}`
                              : 'sin datos de costo'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2">
                        <Link
                          href={`/hidromiel/${lote.receta.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-emerald-700 dark:text-emerald-400 underline"
                        >
                          Ficha pública y QR de {lote.receta.nombre} →
                        </Link>
                      </div>

                      {/* Etapas de producción del lote */}
                      <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                        <p className="text-sm font-semibold">Etapas de producción</p>
                        {lote.etapas.length === 0 ? (
                          <form action={crearEtapasLote} className="mt-3">
                            <input type="hidden" name="loteId" value={lote.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Agregar etapas (Fermentación, Trasiego, Clarificación, Embotellado)
                            </Button>
                          </form>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {lote.etapas.map((etapa) => (
                              <form
                                key={etapa.id}
                                action={actualizarEtapa}
                                className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                              >
                                <input type="hidden" name="etapaId" value={etapa.id} />
                                <div className="min-w-32 flex-1">
                                  <p className="text-sm font-medium">{etapa.nombre}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {etapa.estado === 'HECHA' && etapa.fechaReal
                                      ? `Hecha el ${new Date(etapa.fechaReal).toLocaleDateString('es-MX')}`
                                      : etapa.estado === 'EN_CURSO'
                                        ? 'En curso'
                                        : 'Pendiente'}
                                  </p>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Fecha planeada
                                  </label>
                                  <Input
                                    name="fechaPlaneada"
                                    type="date"
                                    defaultValue={
                                      etapa.fechaPlaneada
                                        ? new Date(etapa.fechaPlaneada).toISOString().slice(0, 10)
                                        : ''
                                    }
                                    className="h-9 w-44"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Estado
                                  </label>
                                  <select name="estado" defaultValue={etapa.estado} className={`${selectClass} h-9 w-36`}>
                                    <option value="PENDIENTE">Pendiente</option>
                                    <option value="EN_CURSO">En curso</option>
                                    <option value="HECHA">Hecha</option>
                                  </select>
                                </div>
                                <Button type="submit" size="sm">
                                  Guardar
                                </Button>
                              </form>
                            ))}
                          </div>
                        )}
                      </div>

                      {abierto ? (
                        <CompletarLoteForm
                          loteId={lote.id}
                          codigoLote={lote.codigoLote}
                          botellasEsperadas={lote.botellasEsperadas}
                          insumos={lote.receta.recetaInsumos.map((ri) => ({
                            id: ri.insumo.id,
                            nombre: ri.insumo.nombre,
                            unidadMedida: ri.insumo.unidadMedida,
                            cantidadTeorica: Number(ri.cantidadConsumida),
                            costoUnitario: Number(ri.insumo.costoUnitario),
                            stockActual: Number(ri.insumo.stockActual),
                          }))}
                        />
                      ) : (
                        <p className="mt-4 border-t dark:border-slate-800 pt-4 text-sm text-slate-500 dark:text-slate-400">
                          Lote {lote.estado === 'COMPLETADO' ? 'completado' : lote.estado.toLowerCase()}{' '}
                          con {lote.botellasReales} botellas reales. Ver detalle en{' '}
                          <Link href="/historial" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                            Historial
                          </Link>
                          .
                        </p>
                      )}

                      {/* Desglose del costo real del lote (consumo ligado al lote) */}
                      {lote.estado === 'COMPLETADO' ? (
                        <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                          <p className="text-sm font-semibold">Costo real del lote</p>
                          {lote.movimientos.length === 0 && lote.costosAdicionales.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              Costo registrado: $
                              {Number(lote.costoTotalLote ?? 0).toFixed(2)}
                              {Number(lote.costoUnitarioPieza ?? 0) > 0
                                ? ` ($${Number(lote.costoUnitarioPieza).toFixed(2)} por botella)`
                                : ''}
                              . Sin desglose de consumo: este lote se registró antes del
                              desglose por consumo real.
                            </p>
                          ) : (
                            <div className="mt-3 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                                    <th className="py-2 pr-3">Concepto</th>
                                    <th className="py-2 pr-3 text-right">Cantidad</th>
                                    <th className="py-2 pr-3 text-right">Costo unitario</th>
                                    <th className="py-2 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lote.movimientos.map((mov) => (
                                    <tr key={mov.id} className="border-b dark:border-slate-800">
                                      <td className="py-2 pr-3 font-medium">{mov.insumo.nombre}</td>
                                      <td className="py-2 pr-3 text-right">
                                        {Number(mov.cantidad)} {mov.insumo.unidadMedida}
                                      </td>
                                      <td className="py-2 pr-3 text-right">
                                        ${Number(mov.costoUnitario ?? 0).toFixed(2)}
                                      </td>
                                      <td className="py-2 text-right font-semibold">
                                        ${Number(mov.total ?? 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                  {lote.costosAdicionales.map((adicional) => (
                                    <tr key={adicional.id} className="border-b dark:border-slate-800">
                                      <td className="py-2 pr-3 font-medium">{adicional.concepto}</td>
                                      <td className="py-2 pr-3 text-right text-slate-500 dark:text-slate-400">
                                        adicional
                                      </td>
                                      <td className="py-2 pr-3 text-right">—</td>
                                      <td className="py-2 text-right font-semibold">
                                        ${Number(adicional.monto).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td className="py-2 pr-3 font-semibold" colSpan={3}>
                                      Total del lote
                                    </td>
                                    <td className="py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                                      ${Number(lote.costoTotalLote ?? 0).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : null}

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
