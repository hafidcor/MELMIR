import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { obtenerClientes } from '@/app/actions/clientes';
import { obtenerProductosParaVenta } from '@/app/actions/ventas';
import {
  cancelarPedido,
  convertirPedidoAVenta,
  crearPedido,
  obtenerApartadasPorReceta,
  obtenerPedidos,
} from '@/app/actions/pedidos';

export const dynamic = 'force-dynamic';

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

const textareaClass =
  'flex min-h-20 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

function formatFecha(fecha: Date | null) {
  if (!fecha) {
    return '—';
  }
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const ESTADO_ESTILO: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  COMPLETADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  CANCELADO: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default async function PedidosPage() {
  const [pedidos, clientes, productos, apartadas] = await Promise.all([
    obtenerPedidos(),
    obtenerClientes(),
    obtenerProductosParaVenta(),
    obtenerApartadasPorReceta(),
  ]);

  let recetas: Array<{ id: string; nombre: string }> = [];
  if (isDbConfigured()) {
    try {
      recetas = await prisma.receta.findMany({
        where: { activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      });
    } catch (error) {
      console.error('PedidosPage: sin acceso a la base de datos', error);
    }
  }

  const pedidosPendientes = pedidos.filter((p) => p.estado === 'PENDIENTE');
  const botellasApartadas = pedidosPendientes.reduce((s, p) => s + p.cantidadBotellas, 0);

  // Disponibilidad por receta: stock total menos botellas apartadas.
  const disponibilidad = recetas.map((receta) => {
    const stock = productos
      .filter((p) => p.receta.id === receta.id)
      .reduce((s, p) => s + p.botellasEnStock, 0);
    const apartado = apartadas[receta.id] ?? 0;
    return { ...receta, stock, apartado, disponible: Math.max(0, stock - apartado) };
  });

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Pedidos anticipados</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aparta botellas antes de producir. Las botellas apartadas no se descuentan
            del stock hasta que el pedido se convierte en venta.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Pedidos pendientes</CardDescription>
              <CardTitle>{pedidosPendientes.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Botellas apartadas</CardDescription>
              <CardTitle>{botellasApartadas} bot.</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Pedidos completados</CardDescription>
              <CardTitle>{pedidos.filter((p) => p.estado === 'COMPLETADO').length}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Disponibilidad por hidromiel</CardTitle>
            <CardDescription>Stock menos botellas apartadas en pedidos pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            {disponibilidad.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay recetas activas.</p>
            ) : (
              <div className="space-y-2">
                {disponibilidad.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm"
                  >
                    <span className="font-medium">{d.nombre}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Stock {d.stock} bot. · Apartadas {d.apartado} bot. ·{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Disponibles {d.disponible} bot.
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo pedido</CardTitle>
            <CardDescription>Registra un pedido antes de tener las botellas listas</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearPedido} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Hidromiel
                </label>
                <select name="recetaId" className={selectClass} defaultValue="" required>
                  <option value="" disabled>
                    Selecciona una hidromiel
                  </option>
                  {recetas.map((receta) => (
                    <option key={receta.id} value={receta.id}>
                      {receta.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cliente (opcional)
                </label>
                <select name="clienteId" className={selectClass} defaultValue="">
                  <option value="">Sin cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cantidad de botellas
                </label>
                <Input name="cantidadBotellas" type="number" min="1" step="1" placeholder="24" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fecha de entrega (opcional)
                </label>
                <Input name="fechaEntrega" type="date" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notas (opcional)
                </label>
                <textarea name="notas" rows={2} placeholder="Anticipo, evento, entrega a domicilio…" className={textareaClass} />
              </div>
              <div className="md:col-span-2 flex justify-end pt-2">
                <Button type="submit">Guardar pedido</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos</CardTitle>
            <CardDescription>Los más recientes primero</CardDescription>
          </CardHeader>
          <CardContent>
            {pedidos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay pedidos. Crea el primero con el formulario de arriba.
              </p>
            ) : (
              <div className="space-y-4">
                {pedidos.map((pedido) => {
                  const lotesReceta = productos.filter((p) => p.receta.id === pedido.recetaId);
                  return (
                    <div
                      key={pedido.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {pedido.receta.nombre} · {pedido.cantidadBotellas} bot.
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {pedido.cliente ? `${pedido.cliente.nombre} · ` : ''}
                            Pedido el {formatFecha(pedido.fechaPedido)}
                            {pedido.fechaEntrega ? ` · entrega ${formatFecha(pedido.fechaEntrega)}` : ''}
                            {pedido.notas ? ` · ${pedido.notas}` : ''}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_ESTILO[pedido.estado]}`}
                        >
                          {pedido.estado}
                        </span>
                      </div>

                      {pedido.estado === 'PENDIENTE' && (
                        <div className="mt-4 space-y-3 border-t dark:border-slate-800 pt-4">
                          {lotesReceta.length === 0 ? (
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Aún no hay botellas en stock de esta hidromiel para convertir el
                              pedido. Completa un lote en{' '}
                              <Link href="/produccion" className="font-medium underline">
                                Producción
                              </Link>
                              .
                            </p>
                          ) : (
                            <form action={convertirPedidoAVenta} className="grid gap-3 md:grid-cols-2">
                              <input type="hidden" name="pedidoId" value={pedido.id} />
                              <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Lote del que salen las botellas
                                </label>
                                <select name="productoTerminadoId" className={selectClass} defaultValue="" required>
                                  <option value="" disabled>
                                    Selecciona un lote
                                  </option>
                                  {lotesReceta.map((producto) => (
                                    <option key={producto.id} value={producto.id}>
                                      {producto.loteProduccion.codigoLote} · {producto.botellasEnStock}{' '}
                                      bot. · ${producto.precioSugerido.toFixed(2)} c/u
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Precio unitario (opcional)
                                </label>
                                <Input name="precioUnitario" type="number" step="0.01" min="0" placeholder="Precio sugerido" />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Pago
                                </label>
                                <select name="estadoPago" className={selectClass} defaultValue="PAGADO">
                                  <option value="PAGADO">Pagado</option>
                                  <option value="PENDIENTE">Pendiente (a crédito)</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Abono inicial, si es a crédito (opcional)
                                </label>
                                <Input name="montoPagado" type="number" step="0.01" min="0" placeholder="0" />
                              </div>
                              <div className="flex items-end gap-2">
                                <Button type="submit">Convertir en venta</Button>
                              </div>
                            </form>
                          )}
                          <form action={cancelarPedido}>
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Cancelar pedido
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
