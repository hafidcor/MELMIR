import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { obtenerHistorialInsumos, obtenerHistorialProduccion } from '@/app/actions/historial';
import { obtenerVentas } from '@/app/actions/ventas';

export const dynamic = 'force-dynamic';

function formatFecha(fecha: Date) {
  return new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const busqueda = (searchParams?.q ?? '').trim().toLowerCase();
  const todosMovimientos = await obtenerHistorialInsumos();
  const lotes = await obtenerHistorialProduccion();
  const ventas = await obtenerVentas();

  const movimientos = busqueda
    ? todosMovimientos.filter(
        (m) =>
          (m.insumo?.nombre ?? '').toLowerCase().includes(busqueda) ||
          (m.referencia ?? '').toLowerCase().includes(busqueda)
      )
    : todosMovimientos;

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
            <h1 className="mt-2 text-3xl font-bold">Historial</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Movimientos de insumos, ventas y lotes de producción recientes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/historial/csv">
              <Button variant="outline">Exportar movimientos (CSV)</Button>
            </a>
            <Link href="/insumos">
              <Button>Registrar movimiento</Button>
            </Link>
          </div>
        </header>

        <form method="get" className="flex flex-wrap gap-2">
          <Input
            name="q"
            placeholder="Buscar movimientos por insumo o referencia…"
            defaultValue={searchParams?.q ?? ''}
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          {busqueda && (
            <Link href="/historial">
              <Button type="button" variant="outline">
                Limpiar
              </Button>
            </Link>
          )}
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos de insumos</CardTitle>
            <CardDescription>
              Últimos 50 movimientos registrados
              {busqueda ? ` que coinciden con «${searchParams?.q}»` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movimientos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {busqueda
                  ? 'Ningún movimiento coincide con la búsqueda.'
                  : 'Aún no hay movimientos registrados. Puedes registrar uno desde'}{' '}
                {!busqueda && (
                  <>
                    <Link href="/insumos" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                      Insumos
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Insumo</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3 text-right">Cantidad</th>
                      <th className="py-2 pr-3 text-right">Saldo</th>
                      <th className="py-2">Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((movimiento) => (
                      <tr key={movimiento.id} className="border-b dark:border-slate-800">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatFecha(movimiento.createdAt)}
                        </td>
                        <td className="py-2 pr-3 font-medium">{movimiento.insumo?.nombre}</td>
                        <td className="py-2 pr-3">{movimiento.tipo}</td>
                        <td className="py-2 pr-3 text-right">
                          {Number(movimiento.cantidad)} {movimiento.insumo?.unidadMedida}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {movimiento.saldoAfter !== null && movimiento.saldoAfter !== undefined
                            ? Number(movimiento.saldoAfter)
                            : '—'}
                        </td>
                        <td className="py-2">{movimiento.referencia ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas recientes</CardTitle>
            <CardDescription>
              Ventas de producto terminado registradas en{' '}
              <Link href="/ventas" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                Ventas
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ventas.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay ventas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Receta</th>
                      <th className="py-2 pr-3">Lote</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3 text-right">Botellas</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta) => (
                      <tr key={venta.id} className="border-b dark:border-slate-800">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatFecha(venta.fecha)}</td>
                        <td className="py-2 pr-3 font-medium">{venta.receta.nombre}</td>
                        <td className="py-2 pr-3">{venta.productoTerminado.loteProduccion.codigoLote}</td>
                        <td className="py-2 pr-3">{venta.cliente ?? '—'}</td>
                        <td className="py-2 pr-3 text-right">{venta.botellasVendidas}</td>
                        <td className="py-2 text-right font-semibold">
                          ${Number(venta.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes recientes</CardTitle>
            <CardDescription>Últimos 20 lotes de producción</CardDescription>
          </CardHeader>
          <CardContent>
            {lotes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay lotes registrados.</p>
            ) : (
              <div className="space-y-3">
                {lotes.map((lote) => (
                  <div key={lote.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                    <div>
                      <p className="font-semibold">{lote.codigoLote}</p>
                      <p className="text-slate-500 dark:text-slate-400">{lote.receta.nombre}</p>
                    </div>
                    <div className="text-right">
                      <p>{lote.estado}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {lote.botellasReales} / {lote.botellasEsperadas} botellas ·{' '}
                        {formatFecha(lote.updatedAt)}
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
