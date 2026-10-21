import { prisma } from '@/lib/prisma';
import { calculateRecipeCost } from '@/app/lib/costeo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PreciosPage() {
  const recetas = await prisma.receta.findMany({
    include: { recetaInsumos: { include: { insumo: true } } },
  });

  const recetasConCosto = await Promise.all(
    recetas.map(async (receta) => {
      const costo = await calculateRecipeCost(receta.id);
      return { ...receta, costo };
    })
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Pricing y costos</h1>
        </header>

        {recetasConCosto.map((receta) => (
          <Card key={receta.id}>
            <CardHeader>
              <CardTitle>{receta.nombre}</CardTitle>
              <CardDescription>
                {receta.estilo} · {receta.rendimientoBotellas} botellas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Costo del lote</p>
                  <p className="mt-2 text-2xl font-bold">${receta.costo.costoLote.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Costo / botella</p>
                  <p className="mt-2 text-2xl font-bold">${receta.costo.costoPorPieza.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs uppercase text-slate-500">Precio sugerido</p>
                  <p className="mt-2 text-2xl font-bold">${(receta.costo.costoPorPieza * 1.3 * 1.16 * 1.08).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
