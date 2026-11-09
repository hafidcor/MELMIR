'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { registrarVenta } from '@/app/actions/ventas';

export type ProductoPos = {
  id: string;
  recetaId: string;
  recetaNombre: string;
  codigoLote: string;
  botellasEnStock: number;
  precioSugerido: number;
  apartadas: number;
};

const selectClass =
  'flex h-12 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-base outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

export function PosForm({
  productos,
  clientes,
}: {
  productos: ProductoPos[];
  clientes: Array<{ id: string; nombre: string }>;
}) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [estadoPago, setEstadoPago] = useState<'PAGADO' | 'PENDIENTE'>('PAGADO');
  const [montoPagado, setMontoPagado] = useState('');

  const producto = productos.find((p) => p.id === productoId);
  const disponibles = producto ? Math.max(0, producto.botellasEnStock - producto.apartadas) : 0;
  const precioUnitario = precio === '' ? (producto?.precioSugerido ?? 0) : Number(precio) || 0;
  const total = useMemo(() => Number((cantidad * precioUnitario).toFixed(2)), [cantidad, precioUnitario]);

  function elegirProducto(id: string) {
    const elegido = productos.find((p) => p.id === id);
    setProductoId(id);
    setCantidad(1);
    setPrecio(elegido ? String(elegido.precioSugerido.toFixed(2)) : '');
  }

  function cambiarCantidad(delta: number) {
    setCantidad((c) => Math.min(Math.max(1, c + delta), Math.max(1, disponibles)));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Elige la hidromiel</CardTitle>
          <CardDescription>Solo aparecen lotes con botellas en stock</CardDescription>
        </CardHeader>
        <CardContent>
          {productos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No hay producto terminado en stock. Completa un lote en Producción primero.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {productos.map((p) => {
                const disp = Math.max(0, p.botellasEnStock - p.apartadas);
                const activo = p.id === productoId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => elegirProducto(p.id)}
                    className={`min-h-20 rounded-xl border-2 p-4 text-left transition ${
                      activo
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                        : 'border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700'
                    }`}
                  >
                    <p className="font-semibold">{p.recetaNombre}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{p.codigoLote}</p>
                    <p className="mt-1 text-sm font-medium">
                      ${p.precioSugerido.toFixed(2)} c/u · {disp} disponibles
                      {p.apartadas > 0 ? ` (${p.apartadas} apartadas)` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {producto && (
        <form action={registrarVenta} className="space-y-6">
          <input type="hidden" name="productoTerminadoId" value={producto.id} />
          <input type="hidden" name="botellasVendidas" value={cantidad} />
          <input type="hidden" name="precioUnitario" value={precioUnitario.toFixed(2)} />
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="estadoPago" value={estadoPago} />
          <input type="hidden" name="montoPagado" value={estadoPago === 'PENDIENTE' ? montoPagado || '0' : ''} />
          <input type="hidden" name="notas" value="Venta rápida (POS)" />

          <Card>
            <CardHeader>
              <CardTitle>2. Cantidad y precio</CardTitle>
              <CardDescription>
                {producto.recetaNombre} · {producto.codigoLote} · {disponibles} disponibles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Button type="button" variant="outline" size="lg" onClick={() => cambiarCantidad(-1)}>
                  −
                </Button>
                <span className="min-w-16 text-center text-4xl font-bold">{cantidad}</span>
                <Button type="button" variant="outline" size="lg" onClick={() => cambiarCantidad(1)}>
                  +
                </Button>
                <span className="text-sm text-slate-500 dark:text-slate-400">botellas</span>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Precio unitario ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Total a cobrar</p>
                <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                  ${total.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Cliente y pago</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cliente (opcional)
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Venta sin cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pago
                </label>
                <select
                  value={estadoPago}
                  onChange={(e) => setEstadoPago(e.target.value as 'PAGADO' | 'PENDIENTE')}
                  className={selectClass}
                >
                  <option value="PAGADO">Pagado</option>
                  <option value="PENDIENTE">Pendiente (a crédito)</option>
                </select>
              </div>
              {estadoPago === 'PENDIENTE' && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Abono inicial ($, opcional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={total}
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(e.target.value)}
                    placeholder="0"
                    className="h-12 text-lg"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <Button type="submit" size="lg" className="h-14 w-full text-lg">
                  Registrar venta · ${total.toFixed(2)}
                </Button>
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  Solo registra la venta y descuenta el stock. No cobra con tarjeta: el
                  cobro se hace aparte, como siempre.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
