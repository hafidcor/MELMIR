import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function InsumosPage() {
  const insumos = await prisma.insumo.findMany({
    orderBy: { nombre: 'asc' },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Inventario de insumos</h1>
        </header>

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
