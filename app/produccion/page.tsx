import { calculateRecipeCost } from '@/app/lib/costeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { prisma } from '@/lib/prisma';

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

  const recetasConCosto = await Promise.all(
    recetas.map(async (receta) => ({
      ...receta,
      costo: await calculateRecipeCost(receta.id),
    }))
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-3xl font-bold">Gestor de recetas</h1>
          </div>
          <Button variant="outline">Duplicar receta</Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Nueva receta</CardTitle>
            <CardDescription>Define la fórmula base de tu cerveza hidromiel</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/crear-receta" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <Input name="nombre" placeholder="Hidromiel Clásica" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estilo</label>
                <Input name="estilo" placeholder="Semi Seco" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ABV</label>
                <Input name="abv" type="number" step="0.1" placeholder="6.5" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Volumen lote</label>
                <Input name="volumenLoteEstimado" type="number" step="0.01" placeholder="60" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Botellas</label>
                <Input name="rendimientoBotellas" type="number" placeholder="120" required />
              </div>

              <div className="xl:col-span-5 flex justify-end pt-2">
                <Button type="submit">Guardar receta</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {recetasConCosto.map((receta) => (
          <Card key={receta.id}>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{receta.nombre}</CardTitle>
                <CardDescription>
                  {receta.estilo} · {receta.rendimientoBotellas} botellas · ABV {Number(receta.abv ?? 0).toFixed(1)}%
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  Editar
                </Button>
                <Button size="sm">Costo: ${receta.costo.costoLote.toFixed(2)}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase text-slate-500">Costo del lote</p>
                      <p className="text-2xl font-bold">${receta.costo.costoLote.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Costo por pieza</p>
                      <p className="text-xl font-semibold">${receta.costo.costoPorPieza.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Rendimiento</p>
                      <p className="text-lg font-medium">{receta.rendimientoBotellas} botellas</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
