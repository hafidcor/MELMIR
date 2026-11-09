import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DbWarning } from '@/components/db-warning';
import { obtenerHistorialInsumos, obtenerHistorialProduccion } from '@/app/actions/historial';

export const dynamic = 'force-dynamic';

function formatFecha(fecha: Date) {
  return new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function HistorialPage() {
  const movimientos = await obtenerHistorialInsumos();
  const lotes = await obtenerHistorialProduccion();

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
            <h1 className="mt-2 text-3xl font-bold">Historial</h1>
            <p className="mt-1 text-sm text-slate-500">
              Movimientos de insumos y lotes de producción recientes.
            </p>
          </div>
          <Link href="/insumos">
            <Button>Registrar movimiento</Button>
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos de insumos</CardTitle>
            <CardDescription>Últimos 50 movimientos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {movimientos.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay movimientos registrados. Puedes registrar uno desde{' '}
                <Link href="/insumos" className="font-medium text-emerald-700 underline">
                  Insumos
                </Link>
                .
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Insumo</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3 text-right">Cantidad</th>
                      <th className="py-2 pr-3 text-right">Saldo</th>
                      <th className="py-2">Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((movimiento) => (
                      <tr key={movimiento.id} className="border-b">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatFecha(movimiento.createdAt)}
                        </td>
                        <td className="py-2 pr-3 font-medium">{movimiento.insumo?.nombre}</td>
                        <td className="py-2 pr-3">{movimiento.tipo}</td>
                        <td className="py-2 pr-3 text-right">
                          {Number(movimiento.cantidad)} {movimiento.insumo?.unidadMedida}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {movimiento.saldoAfter !== null && movimiento.saldoAfter !== undefined
                            ? Number(movimiento.saldoAfter)
                            : '—'}
                        </td>
                        <td className="py-2">{movimiento.referencia ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lotes recientes</CardTitle>
            <CardDescription>Últimos 20 lotes de producción</CardDescription>
          </CardHeader>
          <CardContent>
            {lotes.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay lotes registrados.</p>
            ) : (
              <div className="space-y-3">
                {lotes.map((lote) => (
                  <div key={lote.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <div>
                      <p className="font-semibold">{lote.codigoLote}</p>
                      <p className="text-slate-500">{lote.receta.nombre}</p>
                    </div>
                    <div className="text-right">
                      <p>{lote.estado}</p>
                      <p className="text-slate-500">
                        {lote.botellasReales} / {lote.botellasEsperadas} botellas ·{' '}
                        {formatFecha(lote.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
