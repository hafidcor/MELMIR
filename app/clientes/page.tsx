import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { crearCliente, obtenerClientesConSaldo, registrarAbono } from '@/app/actions/clientes';

export const dynamic = 'force-dynamic';

const textareaClass =
  'flex min-h-20 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

function formatFecha(fecha: Date) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function ClientesPage() {
  const clientes = await obtenerClientesConSaldo();
  const saldoTotal = clientes.reduce((s, c) => s + c.saldoPendiente, 0);
  const clientesConDeuda = clientes.filter((c) => c.saldoPendiente > 0).length;

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quién te compra, cuánto te debe y sus abonos.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Clientes registrados</CardDescription>
              <CardTitle>{clientes.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Clientes con saldo pendiente</CardDescription>
              <CardTitle>{clientesConDeuda}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total por cobrar</CardDescription>
              <CardTitle>${saldoTotal.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo cliente</CardTitle>
            <CardDescription>Regístralo para asociarle ventas a crédito y pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearCliente} className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nombre
                </label>
                <Input name="nombre" placeholder="Nombre del cliente" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Teléfono (opcional)
                </label>
                <Input name="telefono" type="tel" placeholder="322 123 4567" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notas (opcional)
                </label>
                <Input name="notas" placeholder="Distribuidor, restaurante…" />
              </div>
              <div className="md:col-span-3 flex justify-end pt-2">
                <Button type="submit">Guardar cliente</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {clientes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay clientes. Crea el primero con el formulario de arriba; las ventas
                también se pueden registrar sin cliente, como hasta ahora.
              </p>
            </CardContent>
          </Card>
        ) : (
          clientes.map((cliente) => (
            <Card key={cliente.id}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{cliente.nombre}</CardTitle>
                  <CardDescription>
                    {cliente.telefono ? `${cliente.telefono} · ` : ''}
                    {cliente.notas ?? 'Sin notas'}
                    {!cliente.activo ? ' · Inactivo' : ''}
                  </CardDescription>
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    cliente.saldoPendiente > 0
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  Saldo pendiente: ${cliente.saldoPendiente.toFixed(2)}
                </div>
              </CardHeader>
              <CardContent>
                {cliente.ventasPendientes.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sin ventas pendientes. Sus ventas pagadas se ven en{' '}
                    <Link href="/ventas" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                      Ventas
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cliente.ventasPendientes.map((venta) => (
                      <div
                        key={venta.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div>
                            <p className="font-semibold">
                              {venta.recetaNombre} · {venta.codigoLote}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {formatFecha(venta.fecha)} · {venta.botellasVendidas} bot. · total $
                              {venta.total.toFixed(2)} · pagado ${venta.montoPagado.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-bold text-amber-700 dark:text-amber-300">
                            Debe ${venta.saldo.toFixed(2)}
                          </p>
                        </div>
                        <form action={registrarAbono} className="mt-3 flex flex-wrap items-end gap-3">
                          <input type="hidden" name="ventaId" value={venta.id} />
                          <div className="w-40">
                            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Abono ($)
                            </label>
                            <Input
                              name="monto"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={venta.saldo}
                              placeholder={venta.saldo.toFixed(2)}
                              required
                            />
                          </div>
                          <div className="min-w-40 flex-1">
                            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Nota (opcional)
                            </label>
                            <Input name="notas" placeholder="Efectivo, transferencia…" />
                          </div>
                          <Button type="submit" size="sm">
                            Registrar abono
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
