import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { R2Warning } from '@/components/r2-warning';
import { ArchivosEntidad } from '@/components/archivos';
import { obtenerInsumos } from '@/app/actions/dashboard';
import { crearInsumo } from '@/app/actions/produccion';
import { registrarMovimientoInsumo } from '@/app/actions/historial';
import { cambiarEstadoInsumo, editarInsumo } from '@/app/actions/insumos';

export const dynamic = 'force-dynamic';

const UNIDADES = ['L', 'ML', 'KG', 'G', 'PZA', 'BOTELLA'] as const;

const TIPOS_MOVIMIENTO = [
  { value: 'COMPRA', label: 'Compra (entrada)' },
  { value: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada' },
  { value: 'AJUSTE_SALIDA', label: 'Ajuste de salida' },
  { value: 'MERMA', label: 'Merma (salida)' },
  { value: 'PRODUCCION_CONSUMO', label: 'Consumo de producción (salida)' },
] as const;

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500';

export default async function InsumosPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const busqueda = (searchParams?.q ?? '').trim().toLowerCase();
  const todosInsumos = await obtenerInsumos();
  const insumos = busqueda
    ? todosInsumos.filter(
        (i) =>
          i.nombre.toLowerCase().includes(busqueda) || i.codigo.toLowerCase().includes(busqueda)
      )
    : todosInsumos;
  const insumosActivos = todosInsumos.filter((i) => i.activo);
  const stockBajo = insumosActivos.filter((i) => Number(i.stockActual) <= Number(i.stockMinimo));

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Insumos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Inventario de materias primas, altas nuevas y movimientos de stock.
          </p>
        </header>

        {stockBajo.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Alerta de stock bajo ({stockBajo.length})</p>
            <p className="mt-1">
              {stockBajo.map((i) => i.nombre).join(', ')} están en o por debajo de su stock
              mínimo.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Inventario actual</CardTitle>
                <CardDescription>
                  {insumos.length} insumo(s) {busqueda ? `para «${searchParams?.q}»` : 'registrado(s)'}
                  . La fila en rojo indica stock bajo.
                </CardDescription>
              </div>
              <a href="/api/insumos/csv">
                <Button variant="outline" size="sm">
                  Exportar inventario (CSV)
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <form method="get" className="mb-4 flex gap-2">
              <Input
                name="q"
                placeholder="Buscar por nombre o código…"
                defaultValue={searchParams?.q ?? ''}
              />
              <Button type="submit" variant="outline">
                Buscar
              </Button>
              {busqueda && (
                <Link href="/insumos">
                  <Button type="button" variant="outline">
                    Limpiar
                  </Button>
                </Link>
              )}
            </form>

            {insumos.length === 0 ? (
              <p className="text-sm text-slate-500">
                {busqueda
                  ? 'Ningún insumo coincide con la búsqueda.'
                  : 'Aún no hay insumos registrados. Crea el primero con el formulario de abajo.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-3">Código</th>
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Categoría</th>
                      <th className="py-2 pr-3">Unidad</th>
                      <th className="py-2 pr-3 text-right">Costo</th>
                      <th className="py-2 pr-3 text-right">Stock</th>
                      <th className="py-2 pr-3 text-right">Mínimo</th>
                      <th className="py-2 pr-3 text-right">Estado</th>
                      <th className="py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.map((item) => {
                      const enAlerta =
                        item.activo && Number(item.stockActual) <= Number(item.stockMinimo);
                      return (
                        <tr
                          key={item.id}
                          className={`border-b ${enAlerta ? 'bg-red-50' : ''} ${!item.activo ? 'opacity-60' : ''}`}
                        >
                          <td className="py-2 pr-3 font-medium">{item.codigo}</td>
                          <td className="py-2 pr-3">{item.nombre}</td>
                          <td className="py-2 pr-3">{item.categoria}</td>
                          <td className="py-2 pr-3">{item.unidadMedida}</td>
                          <td className="py-2 pr-3 text-right">
                            ${Number(item.costoUnitario).toFixed(2)}
                          </td>
                          <td className="py-2 pr-3 text-right font-semibold">
                            {Number(item.stockActual)}
                          </td>
                          <td className="py-2 pr-3 text-right">{Number(item.stockMinimo)}</td>
                          <td className="py-2 pr-3 text-right">
                            {!item.activo ? (
                              <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                                Inactivo
                              </span>
                            ) : enAlerta ? (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                                Stock bajo
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <form action={cambiarEstadoInsumo} className="inline">
                              <input type="hidden" name="insumoId" value={item.id} />
                              <input
                                type="hidden"
                                name="activo"
                                value={item.activo ? 'false' : 'true'}
                              />
                              <Button type="submit" variant="outline" size="sm">
                                {item.activo ? 'Desactivar' : 'Reactivar'}
                              </Button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editar insumo</CardTitle>
            <CardDescription>
              Cambia nombre, categoría, costo unitario y stock mínimo. El código y el
              stock actual no se editan: el stock solo cambia con movimientos, para no
              perder el historial. No se pueden borrar insumos; para retirarlos, usa
              «Desactivar» en la tabla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todosInsumos.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay insumos para editar.</p>
            ) : (
              <div className="space-y-3">
                {todosInsumos.map((item) => (
                  <details
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {item.nombre} ({item.codigo}){!item.activo ? ' — inactivo' : ''}
                    </summary>
                    <form action={editarInsumo} className="mt-4 grid gap-4 md:grid-cols-2">
                      <input type="hidden" name="insumoId" value={item.id} />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Nombre
                        </label>
                        <Input name="nombre" defaultValue={item.nombre} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Categoría
                        </label>
                        <Input name="categoria" defaultValue={item.categoria} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Costo unitario
                        </label>
                        <Input
                          name="costoUnitario"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={Number(item.costoUnitario)}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Stock mínimo
                        </label>
                        <Input
                          name="stockMinimo"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={Number(item.stockMinimo)}
                          required
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end pt-2">
                        <Button type="submit" size="sm">
                          Guardar cambios
                        </Button>
                      </div>
                    </form>
                    <div className="mt-4">
                      <ArchivosEntidad
                        entidad="INSUMO"
                        entidadId={item.id}
                        titulo="Archivos del insumo"
                        descripcion="Fichas técnicas, certificados o fotos del insumo, guardados en Cloudflare R2."
                      />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo insumo</CardTitle>
              <CardDescription>Da de alta una materia prima en el inventario</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={crearInsumo} className="grid gap-4 md:grid-cols-2">
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
                  <select name="unidadMedida" className={selectClass} defaultValue="KG" required>
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Costo unitario
                  </label>
                  <Input name="costoUnitario" type="number" step="0.01" min="0" placeholder="35" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Stock actual</label>
                  <Input name="stockActual" type="number" step="0.01" min="0" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Stock mínimo</label>
                  <Input name="stockMinimo" type="number" step="0.01" min="0" placeholder="0" />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button type="submit">Guardar insumo</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar movimiento</CardTitle>
              <CardDescription>
                Compras, ajustes, mermas y consumos. Las salidas nunca dejan el stock en
                negativo. Solo aparecen insumos activos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={registrarMovimientoInsumo} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Insumo</label>
                  <select name="insumoId" className={selectClass} defaultValue="" required>
                    <option value="" disabled>
                      Selecciona un insumo
                    </option>
                    {insumosActivos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} ({item.codigo}) — {Number(item.stockActual)}{' '}
                        {item.unidadMedida}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                  <select name="tipo" className={selectClass} defaultValue="COMPRA" required>
                    {TIPOS_MOVIMIENTO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad</label>
                  <Input name="cantidad" type="number" step="0.01" min="0.01" placeholder="10" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Costo unitario (opcional)
                  </label>
                  <Input name="costoUnitario" type="number" step="0.01" min="0" placeholder="Costo actual" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Referencia (opcional)
                  </label>
                  <Input name="referencia" placeholder="Factura, proveedor, nota…" />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button type="submit">Registrar movimiento</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
