import { calculateRecipeCost } from '@/app/lib/costeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { crearReceta } from '@/app/actions/produccion';
import { agregarInsumoAReceta } from '@/app/actions/recetas';

export const dynamic = 'force-dynamic';

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500';

export default async function RecetasPage() {
  let recetas: Array<{
    id: string;
    nombre: string;
    estilo: string;
    abv: unknown;
    rendimientoBotellas: number;
    recetaInsumos: Array<{
      id: string;
      cantidadConsumida: unknown;
      insumo: { id: string; nombre: string; unidadMedida: string };
    }>;
  }> = [];
  let insumos: Array<{ id: string; nombre: string; unidadMedida: string }> = [];

  if (isDbConfigured()) {
    try {
      recetas = await prisma.receta.findMany({
        include: {
          recetaInsumos: {
            include: {
              insumo: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
      });
      insumos = await prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
    } catch (error) {
      console.error('RecetasPage: sin acceso a la base de datos', error);
      recetas = [];
      insumos = [];
    }
  }

  const recetasConCosto = await Promise.all(
    recetas.map(async (receta) => {
      try {
        const costo = await calculateRecipeCost(receta.id);
        return { ...receta, costo };
      } catch {
        return {
          ...receta,
          costo: { costoLote: 0, costoPorPieza: 0 },
        };
      }
    })
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Gestor de recetas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fórmulas de hidromiel, sus insumos y su costo por lote.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Nueva receta</CardTitle>
            <CardDescription>Define la fórmula base de tu hidromiel</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearReceta} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

        {recetasConCosto.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">
                Aún no hay recetas registradas. Crea la primera con el formulario de arriba.
              </p>
            </CardContent>
          </Card>
        )}

        {recetasConCosto.map((receta) => (
          <Card key={receta.id}>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{receta.nombre}</CardTitle>
                <CardDescription>
                  {receta.estilo} · {receta.rendimientoBotellas} botellas · ABV{' '}
                  {Number(receta.abv ?? 0).toFixed(1)}%
                </CardDescription>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                Costo del lote: ${receta.costo.costoLote.toFixed(2)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-2">
                  {receta.recetaInsumos.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Esta receta aún no tiene insumos. Agrégalos con el formulario de abajo.
                    </p>
                  )}
                  {receta.recetaInsumos.map((ri) => (
                    <div key={ri.id} className="flex justify-between border-b pb-2 text-sm">
                      <span>{ri.insumo.nombre}</span>
                      <span>
                        {Number(ri.cantidadConsumida)} {ri.insumo.unidadMedida}
                      </span>
                    </div>
                  ))}

                  <form action={agregarInsumoAReceta} className="flex flex-wrap items-end gap-3 pt-3">
                    <input type="hidden" name="recetaId" value={receta.id} />
                    <div className="min-w-48 flex-1">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Agregar insumo
                      </label>
                      <select name="insumoId" className={selectClass} defaultValue="" required>
                        <option value="" disabled>
                          Selecciona un insumo
                        </option>
                        {insumos.map((insumo) => (
                          <option key={insumo.id} value={insumo.id}>
                            {insumo.nombre} ({insumo.unidadMedida})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad</label>
                      <Input name="cantidad" type="number" step="0.01" min="0.01" placeholder="12" required />
                    </div>
                    <Button type="submit" size="sm">
                      Agregar a la receta
                    </Button>
                  </form>
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
