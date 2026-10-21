import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { obtenerDashboard, obtenerInsumos, obtenerLotes, obtenerRecetas } from '@/app/actions/dashboard';

export default async function HomePage() {
  const dashboard = await obtenerDashboard();
  const insumos = await obtenerInsumos();
  const recetas = await obtenerRecetas();
  const lotes = await obtenerLotes();

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-4xl font-bold">ERP de producción y ventas</h1>
          </div>
          <Button>Nuevo lote</Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Insumos</CardDescription>
              <CardTitle>{dashboard.insumosCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Materias primas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Recetas</CardDescription>
              <CardTitle>{dashboard.recetasCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Fórmulas activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Lotes</CardDescription>
              <CardTitle>{dashboard.lotesCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Órdenes registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Botellas en stock</CardDescription>
              <CardTitle>{dashboard.stockTotal}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Producto terminado</p>
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
                  <div key={item.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span>{item.nombre}</span>
                    <span className="font-semibold">{Number(item.stockActual)} {item.unidadMedida}</span>
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
                  <div key={receta.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span>{receta.nombre}</span>
                    <span className="font-semibold">{receta.rendimientoBotellas} bot.</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Lotes recientes</CardTitle>
            <CardDescription>Producción y cierre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lotes.slice(0, 5).map((lote) => (
                <div key={lote.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-semibold">{lote.codigoLote}</p>
                    <p className="text-slate-500">{lote.receta.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p>{lote.estado}</p>
                    <p className="text-slate-500">{lote.botellasReales} botellas</p>
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
