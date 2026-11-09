import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { obtenerDashboard, obtenerHistorialReciente, obtenerInsumos, obtenerLotes, obtenerRecetas } from '@/app/actions/dashboard';
import { DbWarning } from '@/components/db-warning';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const dashboard = await obtenerDashboard();
  const insumos = await obtenerInsumos();
  const recetas = await obtenerRecetas();
  const lotes = await obtenerLotes();
  const historial = await obtenerHistorialReciente();
  const stockBajo = insumos.filter(
    (item) => Number(item.stockActual) <= Number(item.stockMinimo)
  );

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <DbWarning />
        {stockBajo.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            <p className="font-semibold">
              Stock bajo: {stockBajo.length} insumo(s) en el mínimo o por debajo
            </p>
            <p className="mt-1">
              {stockBajo.map((item) => item.nombre).join(', ')}. Revisa y registra una
              compra en{' '}
              <Link href="/insumos" className="font-medium underline">
                Insumos
              </Link>
              .
            </p>
          </div>
        )}
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
            <h1 className="mt-2 text-4xl font-bold">ERP de producción y ventas</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/pos">
              <Button>Vender (POS)</Button>
            </Link>
            <Link href="/insumos">
              <Button variant="outline">+ Insumo</Button>
            </Link>
            <Link href="/recetas">
              <Button>+ Receta</Button>
            </Link>
            <Link href="/produccion">
              <Button variant="secondary">Nuevo lote</Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Insumos</CardDescription>
              <CardTitle>{dashboard.insumosCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">Materias primas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Recetas</CardDescription>
              <CardTitle>{dashboard.recetasCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fórmulas activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Lotes</CardDescription>
              <CardTitle>{dashboard.lotesCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">Órdenes registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Botellas en stock</CardDescription>
              <CardTitle>{dashboard.stockTotal}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">Producto terminado</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de insumos</CardTitle>
              <CardDescription>Inventario actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insumos.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                    <span>{item.nombre}</span>
                    <span className="font-semibold">
                      {Number(item.stockActual)} {item.unidadMedida}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recetas principales</CardTitle>
              <CardDescription>Más relevantes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recetas.slice(0, 5).map((receta) => (
                  <div key={receta.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                    <span>{receta.nombre}</span>
                    <span className="font-semibold">{receta.rendimientoBotellas} bot.</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Historial reciente</CardTitle>
              <CardDescription>Movimientos y producción</CardDescription>
            </div>
            <Link href="/historial">
              <Button variant="outline" size="sm">
                Ver historial
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historial.map((movimiento) => (
                <div key={movimiento.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                  <div>
                    <p className="font-semibold">{movimiento.insumo?.nombre}</p>
                    <p className="text-slate-500 dark:text-slate-400">{movimiento.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p>{Number(movimiento.cantidad)} {movimiento.insumo?.unidadMedida}</p>
                    <p className="text-slate-500 dark:text-slate-400">{movimiento.referencia}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Lotes recientes</CardTitle>
              <CardDescription>Producción y cierre</CardDescription>
            </div>
            <Link href="/produccion">
              <Button variant="outline" size="sm">
                Ver todos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lotes.slice(0, 5).map((lote) => (
                <div key={lote.id} className="flex items-center justify-between border-b dark:border-slate-800 pb-2 text-sm">
                  <div>
                    <p className="font-semibold">{lote.codigoLote}</p>
                    <p className="text-slate-500 dark:text-slate-400">{lote.receta.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p>{lote.estado}</p>
                    <p className="text-slate-500 dark:text-slate-400">{lote.botellasReales} botellas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
