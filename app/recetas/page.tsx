import { crearInsumo } from '@/app/actions/produccion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { prisma } from '@/lib/prisma';

export default async function InsumosPage() {
  const insumos = await prisma.insumo.findMany({
    orderBy: { nombre: 'asc' },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-3xl font-bold">Inventario de insumos</h1>
          </div>
          <Button variant="outline">Exportar CSV</Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Registrar insumo</CardTitle>
            <CardDescription>Agrega una nueva materia prima o material auxiliar</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearInsumo} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Código</label>
                <Input name="codigo" placeholder="MEL-001" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <Input name="nombre" placeholder="Miel de agave" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoría</label>
                <Input name="categoria" placeholder="Azúcar" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unidad</label>
                <select
                  name="unidadMedida"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  defaultValue="KG"
                >
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="G">G</option>
                  <option value="PZA">PZA</option>
                  <option value="BOTELLA">BOTELLA</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Costo unitario</label>
                <Input name="costoUnitario" type="number" step="0.01" placeholder="35.00" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Stock actual</label>
                <Input name="stockActual" type="number" step="0.01" placeholder="0" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Stock mínimo</label>
                <Input name="stockMinimo" type="number" step="0.01" placeholder="0" required />
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex justify-end pt-2">
                <Button type="submit">Guardar insumo</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Materiales directos y auxiliares</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 pr-4">Código</th>
                    <th className="py-3 pr-4">Nombre</th>
                    <th className="py-3 pr-4">Categoría</th>
                    <th className="py-3 pr-4">Unidad</th>
                    <th className="py-3 pr-4">Costo</th>
                    <th className="py-3 pr-4">Stock</th>
                    <th className="py-3 pr-4">Stock mín.</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((insumo) => (
                    <tr key={insumo.id} className="border-b last:border-none">
                      <td className="py-3 pr-4">{insumo.codigo}</td>
                      <td className="py-3 pr-4">{insumo.nombre}</td>
                      <td className="py-3 pr-4">{insumo.categoria}</td>
                      <td className="py-3 pr-4">{insumo.unidadMedida}</td>
                      <td className="py-3 pr-4">${Number(insumo.costoUnitario).toFixed(2)}</td>
                      <td className="py-3 pr-4">{Number(insumo.stockActual)}</td>
                      <td className="py-3 pr-4">{Number(insumo.stockMinimo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
