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
import { crearNotaLote, cambiarResueltoNota } from '@/app/actions/seguimiento';
import {
  calcularSeguimientoLote,
  cuentaRegresivaEtapa,
  estiloCuentaRegresiva,
  estiloRecomendacion,
  type LoteSeguimientoInput,
} from '@/app/lib/seguimiento';
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
      fechaInicio: Date | null;
    }>;
    movimientos: Array<{
      id: string;
      cantidad: unknown;
      costoUnitario: unknown;
      total: unknown;
      insumo: { nombre: string; unidadMedida: string };
    }>;
    costosAdicionales: Array<{ id: string; concepto: string; monto: unknown }>;
    notas: Array<{
      id: string;
      tipo: string;
      texto: string;
      insumoId: string | null;
      insumo: { nombre: string } | null;
      etapa: string | null;
      resuelto: boolean;
      createdAt: Date;
    }>;
    productoTerminado: {
      botellasEnStock: number;
      _count: { ventas: number };
      ventas: Array<{ botellasVendidas: number }>;
    } | null;
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
          notas: {
            include: { insumo: true },
            orderBy: { createdAt: 'asc' },
          },
          productoTerminado: {
            include: {
              _count: { select: { ventas: true } },
              ventas: { select: { botellasVendidas: true } },
            },
          },
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
                  const seguimientoInput: LoteSeguimientoInput = {
                    id: lote.id,
                    codigoLote: lote.codigoLote,
                    estado: lote.estado,
                    recetaNombre: lote.receta.nombre,
                    etapas: lote.etapas.map((e) => ({
                      id: e.id,
                      nombre: e.nombre,
                      orden: e.orden,
                      estado: e.estado,
                      fechaPlaneada: e.fechaPlaneada,
                      fechaReal: e.fechaReal,
                      fechaInicio: e.fechaInicio,
                    })),
                    notas: lote.notas.map((n) => ({
                      id: n.id,
                      tipo: n.tipo,
                      texto: n.texto,
                      insumoId: n.insumoId,
                      insumoNombre: n.insumo ? n.insumo.nombre : null,
                      etapa: n.etapa,
                      resuelto: n.resuelto,
                      createdAt: n.createdAt,
                    })),
                    insumosReceta: lote.receta.recetaInsumos.map((ri) => ({
                      insumoId: ri.insumo.id,
                      nombre: ri.insumo.nombre,
                      cantidadTeorica: Number(ri.cantidadConsumida),
                      stockActual: Number(ri.insumo.stockActual),
                      unidadMedida: ri.insumo.unidadMedida,
                    })),
                    botellasEnStock: lote.productoTerminado?.botellasEnStock ?? 0,
                    ventasCount: lote.productoTerminado?._count.ventas ?? 0,
                    botellasVendidas: (lote.productoTerminado?.ventas ?? []).reduce(
                      (sum, v) => sum + v.botellasVendidas,
                      0
                    ),
                  };
                  const seguimiento = calcularSeguimientoLote(seguimientoInput);
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

                      {/* Insignias de alerta del seguimiento */}
                      {(seguimiento.problemasAbiertos.length > 0 ||
                        seguimiento.etapasVencidas.length > 0 ||
                        seguimiento.etapasPorVencer.length > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {seguimiento.problemasAbiertos.length > 0 && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              ⚠ {seguimiento.problemasAbiertos.length} problema
                              {seguimiento.problemasAbiertos.length === 1 ? '' : 's'} abierto
                              {seguimiento.problemasAbiertos.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {seguimiento.etapasVencidas.length > 0 && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              ⏰ {seguimiento.etapasVencidas.length} etapa
                              {seguimiento.etapasVencidas.length === 1 ? '' : 's'} vencida
                              {seguimiento.etapasVencidas.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {seguimiento.etapasPorVencer.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {seguimiento.etapasPorVencer.length} etapa
                              {seguimiento.etapasPorVencer.length === 1 ? '' : 's'} por vencer
                            </span>
                          )}
                        </div>
                      )}

                      {/* Seguimiento: avance, cuenta regresiva y fecha estimada */}
                      <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Seguimiento</p>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${estiloCuentaRegresiva(seguimiento.cuentaRegresivaLote.tono)}`}
                          >
                            {seguimiento.cuentaRegresivaLote.texto}
                          </span>
                        </div>
                        {seguimiento.etapasTotal > 0 ? (
                          <>
                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full bg-emerald-600"
                                style={{ width: `${seguimiento.avancePorcentaje}%` }}
                              />
                            </div>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                              Avance: {seguimiento.etapasHechas} de {seguimiento.etapasTotal}{' '}
                              etapas ({seguimiento.avancePorcentaje}%)
                              {seguimiento.fechaEstimadaLista
                                ? ` · Listo estimado: ${new Date(seguimiento.fechaEstimadaLista).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                                : ' · Sin fecha estimada: asigna fechas planeadas a las etapas.'}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Sin etapas todavía: agrega las 4 etapas para llevar el seguimiento
                            con tiempos.
                          </p>
                        )}

                        {/* Recomendaciones personalizadas del lote */}
                        <div className="mt-3 space-y-2">
                          {seguimiento.recomendaciones.map((rec, i) => {
                            const estilo = estiloRecomendacion(rec.nivel);
                            return (
                              <div
                                key={i}
                                className={`rounded-lg border px-3 py-2 text-sm ${estilo.clases}`}
                              >
                                <span className="font-semibold">{estilo.etiqueta}: </span>
                                {rec.mensaje}
                              </div>
                            );
                          })}
                        </div>
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
                            {lote.etapas.map((etapa) => {
                              const cuenta = cuentaRegresivaEtapa({
                                id: etapa.id,
                                nombre: etapa.nombre,
                                orden: etapa.orden,
                                estado: etapa.estado,
                                fechaPlaneada: etapa.fechaPlaneada,
                                fechaReal: etapa.fechaReal,
                                fechaInicio: etapa.fechaInicio,
                              });
                              return (
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
                                  <span
                                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${estiloCuentaRegresiva(cuenta.tono)}`}
                                  >
                                    {cuenta.texto}
                                  </span>
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
                              );
                            })}
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

                      {/* Notas e incidencias del lote */}
                      <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                        <p className="text-sm font-semibold">Notas e incidencias</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Anota lo que pase con el lote o reporta un problema con un
                          ingrediente o una parte del proceso.
                        </p>
                        {lote.notas.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Sin notas todavía.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {lote.notas.map((nota) => (
                              <li
                                key={nota.id}
                                className={`rounded-lg border p-3 text-sm ${
                                  nota.tipo === 'PROBLEMA' && !nota.resuelto
                                    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/60'
                                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      nota.tipo === 'PROBLEMA'
                                        ? nota.resuelto
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {nota.tipo === 'PROBLEMA'
                                      ? nota.resuelto
                                        ? 'Problema resuelto'
                                        : 'Problema abierto'
                                      : 'Nota'}
                                  </span>
                                  {nota.insumo && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      Insumo: {nota.insumo.nombre}
                                    </span>
                                  )}
                                  {nota.etapa && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      Etapa: {nota.etapa}
                                    </span>
                                  )}
                                  <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(nota.createdAt).toLocaleDateString('es-MX', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                                <p className="mt-2 whitespace-pre-line">{nota.texto}</p>
                                {nota.tipo === 'PROBLEMA' && (
                                  <form action={cambiarResueltoNota} className="mt-2">
                                    <input type="hidden" name="notaId" value={nota.id} />
                                    <input
                                      type="hidden"
                                      name="resuelto"
                                      value={nota.resuelto ? 'false' : 'true'}
                                    />
                                    <Button type="submit" variant="outline" size="sm">
                                      {nota.resuelto ? 'Reabrir problema' : 'Marcar como resuelto'}
                                    </Button>
                                  </form>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <form
                          action={crearNotaLote}
                          className="mt-3 grid gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                        >
                          <input type="hidden" name="loteId" value={lote.id} />
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Tipo
                              </label>
                              <select name="tipo" defaultValue="NOTA" className={selectClass}>
                                <option value="NOTA">Nota</option>
                                <option value="PROBLEMA">Problema</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Insumo (si es problema con un ingrediente)
                              </label>
                              <select name="insumoId" defaultValue="" className={selectClass}>
                                <option value="">Sin insumo</option>
                                {lote.receta.recetaInsumos.map((ri) => (
                                  <option key={ri.insumo.id} value={ri.insumo.id}>
                                    {ri.insumo.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Etapa (si es problema de una parte del proceso)
                              </label>
                              <select name="etapa" defaultValue="" className={selectClass}>
                                <option value="">Sin etapa</option>
                                {['Fermentación', 'Trasiego', 'Clarificación', 'Embotellado'].map(
                                  (nombre) => (
                                    <option key={nombre} value={nombre}>
                                      {nombre}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                              Nota o problema
                            </label>
                            <textarea
                              name="texto"
                              required
                              rows={2}
                              maxLength={2000}
                              placeholder="Ej.: La miel llegó con color más oscuro de lo normal…"
                              className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100"
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button type="submit" size="sm">
                              Agregar nota
                            </Button>
                          </div>
                        </form>
                      </div>

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
