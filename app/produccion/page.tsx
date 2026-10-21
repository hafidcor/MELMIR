import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ProduccionPage() {
  const lotes = await prisma.loteProduccion.findMany({
    include: { receta: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Producción</h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Lotes de producción</CardTitle>
            <CardDescription>Estado operativo y rendimiento real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lotes.map((lote) => (
                <div key={lote.id} className="rounded-lg border p-4">
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
