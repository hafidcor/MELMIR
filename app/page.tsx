import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-4xl font-bold">ERP de Hidromiel</h1>
          </div>
          <Button>Nuevo lote</Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Insumos</CardDescription>
              <CardTitle>245</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Materias primas registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Recetas</CardDescription>
              <CardTitle>12</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Fórmulas activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Lotes</CardDescription>
              <CardTitle>9</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Órdenes en producción</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Producto terminado</CardDescription>
              <CardTitle>3,920</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Botellas en stock</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Costeo de receta</CardTitle>
              <CardDescription>Hidromiel Clásica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Costo del lote</span>
                  <span className="font-semibold">$1,248.30</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo por pieza</span>
                  <span className="font-semibold">$10.40</span>
                </div>
                <div className="flex justify-between">
                  <span>Rendimiento</span>
                  <span className="font-semibold">120 botellas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing sugerido</CardTitle>
              <CardDescription>Calculadora de venta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Precio público</span>
                  <span className="font-semibold">$189.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Paquete 6</span>
                  <span className="font-semibold">$1,034.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Caja 24</span>
                  <span className="font-semibold">$4,120.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
