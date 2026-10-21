import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const totalInsumos = await prisma.insumo.count();
  const totalRecetas = await prisma.receta.count();
  const totalLotes = await prisma.loteProduccion.count();
  const productoTerminado = await prisma.productoTerminado.aggregate({
    _sum: { botellasEnStock: true },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard ejecutivo</h1>
        </header>

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
              <CardTitle>{productoTerminado._sum.botellasEnStock ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </section>
      </div>
    </main>
  );
}
