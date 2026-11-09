import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DbWarning } from '@/components/db-warning';
import { GraficoBarrasVentas, GraficoDonaLotes, GraficoStockInsumos } from '@/components/graficas';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { obtenerResumenVentas, obtenerVentas, type ResumenVentas } from '@/app/actions/ventas';
import { obtenerProximasEtapas, type EtapaProxima } from '@/app/actions/alertas';

export const dynamic = 'force-dynamic';

/**
 * Dashboard ejecutivo: distinto del home. Se centra en alertas y en lo
 * que necesita atención hoy: stock bajo, lotes abiertos y producto en stock.
 * Sin base de datos muestra ceros y estados vacíos, sin error 500.
 */
export default async function DashboardPage() {
  let totalInsumos = 0;
  let totalRecetas = 0;
  let totalLotes = 0;
  let stockFinal = 0;
  let stockBajo: Array<{ id: string; nombre: string; stockActual: unknown; stockMinimo: unknown; unidadMedida: string }> = [];
  let lotesAbiertos: Array<{ id: string; codigoLote: string; estado: string; botellasEsperadas: number; receta: { nombre: string } }> = [];
  let productos: Array<{ id: string; botellasEnStock: number; costoUnitarioBotella: unknown; receta: { nombre: string }; loteProduccion: { codigoLote: string } }> = [];
  let resumenVentas: ResumenVentas = {
    botellasVendidas: 0,
    ingresosTotales: 0,
    ventasMes: 0,
    ingresosMes: 0,
    ventasCount: 0,
    margenTotal: 0,
    margenMes: 0,
    ventasSinCosto: 0,
    porMes: [],
  };
  let ventasRecientes: Awaited<ReturnType<typeof obtenerVentas>> = [];
  let proximasEtapas: EtapaProxima[] = [];
  let insumosTodos: Array<{ id: string; nombre: string; stockActual: unknown; stockMinimo: unknown; unidadMedida: string }> = [];
  let lotesTodos: Array<{ estado: string }> = [];

  resumenVentas = await obtenerResumenVentas();
  ventasRecientes = (await obtenerVentas()).slice(0, 5);
  proximasEtapas = await obtenerProximasEtapas();

  if (isDbConfigured()) {
    try {
      const [insumos, recetas, lotes, productoTerminado, productosTerminados] = await Promise.all([
        prisma.insumo.findMany({ orderBy: { nombre: 'asc' } }),
        prisma.receta.count(),
        prisma.loteProduccion.findMany({
          include: { receta: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.productoTerminado.aggregate({ _sum: { botellasEnStock: true } }),
        prisma.productoTerminado.findMany({
          include: { receta: true, loteProduccion: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      totalInsumos = insumos.length;
      totalRecetas = recetas;
      totalLotes = lotes.length;
      stockFinal = productoTerminado._sum.botellasEnStock ?? 0;
      insumosTodos = insumos;
      lotesTodos = lotes;
      stockBajo = insumos.filter((i) => Number(i.stockActual) <= Number(i.stockMinimo));
      lotesAbiertos = lotes.filter((l) => l.estado === 'PENDIENTE' || l.estado === 'EN_PRODUCCION');
      productos = productosTerminados;
    } catch (error) {
      console.error('DashboardPage: sin acceso a la base de datos', error);
    }
  }

  const insumosParaGrafico = insumosTodos.map((i) => ({
    nombre: i.nombre,
    stock: Number(i.stockActual),
    minimo: Number(i.stockMinimo),
    unidad: i.unidadMedida,
  }));
  const lotesPorEstado = (['PENDIENTE', 'EN_PRODUCCION', 'COMPLETADO', 'CANCELADO'] as const).map(
    (estado) => ({ estado, cantidad: lotesTodos.filter((l) => l.estado === estado).length })
  );

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard ejecutivo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Lo que necesita atención hoy: stock, lotes abiertos y producto terminado.
          </p>
        </header>

        {stockBajo.length > 0 && (
          <Link href="/insumos" className="block">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
              <p className="font-medium">
                ⚠️ {stockBajo.length} insumo(s) en stock bajo: {stockBajo.map((i) => i.nombre).join(', ')}. Toca para verlos y reponer.
              </p>
              <span className="shrink-0 font-bold">Ver →</span>
            </div>
          </Link>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Insumos</CardDescription>
              <CardTitle>{totalInsumos}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Recetas</CardDescription>
              <CardTitle>{totalRecetas}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Lotes</CardDescription>
              <CardTitle>{totalLotes}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Stock final</CardDescription>
              <CardTitle>{stockFinal} bot.</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Botellas vendidas</CardDescription>
              <CardTitle>{resumenVentas.botellasVendidas} bot.</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ingresos totales por ventas</CardDescription>
              <CardTitle>${resumenVentas.ingresosTotales.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ventas de este mes</CardDescription>
              <CardTitle>
                {resumenVentas.ventasMes} bot. · ${resumenVentas.ingresosMes.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>Margen de este mes</CardDescription>
              <CardTitle>${resumenVentas.margenMes.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Precio de venta menos costo por botella. Margen total histórico: $
                {resumenVentas.margenTotal.toFixed(2)}
                {resumenVentas.ventasSinCosto > 0
                  ? ` · ${resumenVentas.ventasSinCosto} venta(s) sin costo registrado no se incluyen en el margen.`
                  : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Próximas etapas de producción</CardTitle>
                <CardDescription>Vencidas o que vencen en los próximos 7 días</CardDescription>
              </div>
              <Link href="/produccion">
                <Button variant="outline" size="sm">
                  Ir a producción
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {proximasEtapas.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sin etapas próximas. Asigna fechas planeadas a las etapas en Producción
                  para que aparezcan aquí.
                </p>
              ) : (
                <div className="space-y-2">
                  {proximasEtapas.map((etapa) => (
                    <div
                      key={etapa.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
                        etapa.vencida
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/60'
                          : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/60'
                      }`}
                    >
                      <span className="font-medium">
                        {etapa.nombre} · {etapa.loteCodigo} ({etapa.recetaNombre})
                      </span>
                      <span className="font-semibold">
                        {etapa.vencida ? 'Vencida · ' : ''}
                        {etapa.fechaPlaneada
                          ? new Date(etapa.fechaPlaneada).toLocaleDateString('es-MX')
                          : 'Sin fecha'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Ventas por mes</CardTitle>
              <CardDescription>Botellas vendidas en los últimos 6 meses</CardDescription>
            </div>
            <Link href="/ventas">
              <Button variant="outline" size="sm">
                Ir a ventas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <GraficoBarrasVentas datos={resumenVentas.porMes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Alerta de stock bajo</CardTitle>
              <CardDescription>Insumos con stock igual o menor al mínimo</CardDescription>
            </div>
            <Link href="/insumos">
              <Button variant="outline" size="sm">
                Ir a insumos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stockBajo.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay insumos en stock bajo. Si la base de datos no está configurada, aquí
                aparecerán las alertas cuando haya datos.
              </p>
            ) : (
              <div className="space-y-2">
                {stockBajo.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 px-4 py-2 text-sm"
                  >
                    <span className="font-medium">{item.nombre}</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {Number(item.stockActual)} / mín. {Number(item.stockMinimo)} {item.unidadMedida}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock de insumos</CardTitle>
            <CardDescription>Stock actual frente al stock mínimo de cada insumo</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoStockInsumos datos={insumosParaGrafico} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lotes pendientes y en producción</CardTitle>
              <CardDescription>Órdenes abiertas que necesitan cierre</CardDescription>
            </CardHeader>
            <CardContent>
              {lotesAbiertos.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No hay lotes abiertos.</p>
              ) : (
                <div className="space-y-3">
                  {lotesAbiertos.map((lote) => (
                    <div key={lote.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                      <div>
                        <p className="font-semibold">{lote.codigoLote}</p>
                        <p className="text-slate-500 dark:text-slate-400">{lote.receta.nombre}</p>
                      </div>
                      <div className="text-right">
                        <p>{lote.estado}</p>
                        <p className="text-slate-500 dark:text-slate-400">{lote.botellasEsperadas} bot. esperadas</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link href="/produccion">
                  <Button variant="outline" size="sm">
                    Ir a producción
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Producto terminado en stock</CardTitle>
              <CardDescription>Botellas listas por lote</CardDescription>
            </CardHeader>
            <CardContent>
              {productos.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay producto terminado en stock.</p>
              ) : (
                <div className="space-y-3">
                  {productos.slice(0, 8).map((producto) => (
                    <div key={producto.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                      <div>
                        <p className="font-semibold">{producto.receta.nombre}</p>
                        <p className="text-slate-500 dark:text-slate-400">{producto.loteProduccion.codigoLote}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{producto.botellasEnStock} bot.</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          ${Number(producto.costoUnitarioBotella).toFixed(2)} c/u
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lotes por estado</CardTitle>
            <CardDescription>Distribución de lotes según su estado</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoDonaLotes datos={lotesPorEstado} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Ventas recientes</CardTitle>
              <CardDescription>Últimas ventas de producto terminado</CardDescription>
            </div>
            <Link href="/ventas">
              <Button variant="outline" size="sm">
                Ir a ventas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ventasRecientes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay ventas registradas.</p>
            ) : (
              <div className="space-y-3">
                {ventasRecientes.map((venta) => (
                  <div key={venta.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                    <div>
                      <p className="font-semibold">{venta.receta.nombre}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {venta.productoTerminado.loteProduccion.codigoLote}
                        {venta.cliente ? ` · ${venta.cliente}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {venta.botellasVendidas} bot. · ${Number(venta.total).toFixed(2)}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {new Date(venta.fecha).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
