import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RecetasPage() {
  const recetas = await prisma.receta.findMany({
    include: {
      recetaInsumos: {
        include: {
          insumo: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Gestor de recetas</h1>
        </header>

        {recetas.map((receta) => (
          <Card key={receta.id}>
            <CardHeader>
              <CardTitle>{receta.nombre}</CardTitle>
              <CardDescription>
                {receta.estilo} · {receta.rendimientoBotellas} botellas · ABV {Number(receta.abv ?? 0).toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {receta.recetaInsumos.map((ri) => (
                  <div key={ri.id} className="flex justify-between border-b pb-2 text-sm">
                    <span>{ri.insumo.nombre}</span>
                    <span>
                      {Number(ri.cantidadConsumida)} {ri.insumo.unidadMedida}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
