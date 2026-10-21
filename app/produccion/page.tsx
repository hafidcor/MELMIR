import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { prisma } from '@/lib/prisma';
import { crearLote } from '@/app/actions/produccion';

export default async function ProduccionPage() {
  const recetas = await prisma.receta.findMany({
    orderBy: { nombre: 'asc' },
  });

  const lotes = await prisma.loteProduccion.findMany({
    include: { receta: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-3xl font-bold">Producción</h1>
          </div>
          <Button>Crear orden de producción</Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Nueva orden de trabajo</CardTitle>
            <CardDescription>Genera un lote de producción a partir de una receta activa</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearLote} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Receta</label>
                <select
                  name="recetaId"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Selecciona una receta
                  </option>
                  {recetas.map((receta) => (
                    <option key={receta.id} value={receta.id}>
                      {receta.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Botellas esperadas</label>
                <Input name="botellasEsperadas" type="number" placeholder="120" required />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <Button type="submit">Crear lote</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes de producción</CardTitle>
            <CardDescription>Estado operativo y rendimiento real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lotes.map((lote) => (
                <div key={lote.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{lote.codigoLote}</p>
                      <p className="text-sm text-slate-500">{lote.receta.nombre}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                      {lote.estado}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-slate-500">Esperadas</p>
                      <p className="font-semibold">{lote.botellasEsperadas}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Reales</p>
                      <p className="font-semibold">{lote.botellasReales}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Coste lote</p>
                      <p className="font-semibold">${Number(lote.costoTotalLote ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Costo / pieza</p>
                      <p className="font-semibold">${Number(lote.costoUnitarioPieza ?? 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Ver detalle
                    </Button>
                    <Button size="sm">Completar lote</Button>
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
