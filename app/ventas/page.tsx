import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { R2Warning } from '@/components/r2-warning';
import { subirArchivo } from '@/app/actions/archivos';
import { obtenerProductosParaVenta, obtenerVentas, registrarVenta } from '@/app/actions/ventas';

export const dynamic = 'force-dynamic';

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500';

function formatFecha(fecha: Date) {
  return new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function VentasPage() {
  const productos = await obtenerProductosParaVenta();
  const ventas = await obtenerVentas();

  const botellasVendidas = ventas.reduce((suma, venta) => suma + venta.botellasVendidas, 0);
  const ingresosTotales = ventas.reduce((suma, venta) => suma + Number(venta.total), 0);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Venta de producto terminado: al vender se descuentan las botellas del lote.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Botellas vendidas</CardDescription>
              <CardTitle>{botellasVendidas}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ingresos totales</CardDescription>
              <CardTitle>${ingresosTotales.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ventas registradas</CardDescription>
              <CardTitle>{ventas.length}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Registrar venta</CardTitle>
            <CardDescription>
              Solo aparecen lotes con botellas en stock. Si dejas el precio vacío, se usa
              el precio sugerido de Precios (costo + IEPS 8% + IVA 16% + margen 30%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productos.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay producto terminado en stock para vender. Completa un lote en{' '}
                <Link href="/produccion" className="font-medium text-emerald-700 underline">
                  Producción
                </Link>{' '}
                para tener botellas disponibles.
              </p>
            ) : (
              <form action={registrarVenta} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Lote con stock
                  </label>
                  <select name="productoTerminadoId" className={selectClass} defaultValue="" required>
                    <option value="" disabled>
                      Selecciona un lote
                    </option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.receta.nombre} — {producto.loteProduccion.codigoLote} ·{' '}
                        {producto.botellasEnStock} bot. · precio sugerido $
                        {producto.precioSugerido.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Botellas vendidas
                  </label>
                  <Input name="botellasVendidas" type="number" min="1" step="1" placeholder="12" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Precio unitario (opcional)
                  </label>
                  <Input name="precioUnitario" type="number" step="0.01" min="0" placeholder="Precio sugerido del lote" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Cliente (opcional)
                  </label>
                  <Input name="cliente" placeholder="Nombre del cliente" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notas (opcional)
                  </label>
                  <Input name="notas" placeholder="Factura, forma de pago, nota…" />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button type="submit">Registrar venta</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de ventas</CardTitle>
            <CardDescription>
              Últimas {ventas.length} venta(s). El total es botellas vendidas por precio
              unitario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ventas.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay ventas registradas. Registra la primera con el formulario de
                arriba.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Receta</th>
                      <th className="py-2 pr-3">Lote</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3 text-right">Botellas</th>
                      <th className="py-2 pr-3 text-right">Precio unit.</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta) => (
                      <tr key={venta.id} className="border-b">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatFecha(venta.fecha)}</td>
                        <td className="py-2 pr-3 font-medium">{venta.receta.nombre}</td>
                        <td className="py-2 pr-3">{venta.productoTerminado.loteProduccion.codigoLote}</td>
                        <td className="py-2 pr-3">{venta.cliente ?? '—'}</td>
                        <td className="py-2 pr-3 text-right">{venta.botellasVendidas}</td>
                        <td className="py-2 pr-3 text-right">
                          ${Number(venta.precioUnitario).toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-semibold">
                          ${Number(venta.total).toFixed(2)}
                        </td>
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
            <CardTitle>Archivos de ventas</CardTitle>
            <CardDescription>
              Facturas, comprobantes o documentos de una venta, guardados en
              Cloudflare R2. También se ven en{' '}
              <Link href="/archivos?entidad=VENTA" className="font-medium text-emerald-700 underline">
                Archivos
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ventas.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay ventas a las que adjuntar archivos.
              </p>
            ) : (
              <form
                action={subirArchivo}
                encType="multipart/form-data"
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="entidad" value="VENTA" />
                <div className="min-w-56 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Venta</label>
                  <select name="entidadId" className={selectClass} defaultValue="" required>
                    <option value="" disabled>
                      Selecciona una venta
                    </option>
                    {ventas.map((venta) => (
                      <option key={venta.id} value={venta.id}>
                        {formatFecha(venta.fecha)} · {venta.receta.nombre} ·{' '}
                        {venta.productoTerminado.loteProduccion.codigoLote} ·{' '}
                        {venta.botellasVendidas} bot.
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-52 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Archivo (imagen o PDF, máx. 5 MB)
                  </label>
                  <input
                    type="file"
                    name="archivo"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    required
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
                  />
                </div>
                <Button type="submit" size="sm">
                  Subir a R2
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
