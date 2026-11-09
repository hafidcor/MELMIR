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
import { cambiarEstadoInsumo, editarInsumo, eliminarInsumo, obtenerReferenciasInsumo } from '@/app/actions/insumos';

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
  'flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

export default async function InsumosPage({
  searchParams,
}: {
  searchParams?: { q?: string; eliminar?: string; ok?: string };
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

  const okMensaje =
    searchParams?.ok === 'editado'
      ? 'Insumo actualizado correctamente.'
      : searchParams?.ok === 'eliminado'
        ? 'Insumo eliminado correctamente.'
        : null;
  const volverUrl = busqueda
    ? `/insumos?q=${encodeURIComponent(searchParams?.q ?? '')}`
    : '/insumos';

  const eliminarId = (searchParams?.eliminar ?? '').trim();
  const referenciasEliminar = eliminarId
    ? await obtenerReferenciasInsumo(eliminarId)
    : null;
  const usosEliminar: string[] = [];
  if (referenciasEliminar) {
    if (referenciasEliminar.recetas.length > 0) {
      usosEliminar.push(
        `${referenciasEliminar.recetas.length === 1 ? 'la receta' : 'las recetas'} ${referenciasEliminar.recetas
          .map((r) => `«${r}»`)
          .join(', ')}`
      );
    }
    if (referenciasEliminar.movimientos > 0) {
      usosEliminar.push(`${referenciasEliminar.movimientos} movimiento(s) de inventario`);
    }
    if (referenciasEliminar.archivos > 0) {
      usosEliminar.push(`${referenciasEliminar.archivos} archivo(s) guardado(s)`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Insumos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Inventario de materias primas, altas nuevas y movimientos de stock.
          </p>
        </header>

        {okMensaje && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-sm text-emerald-900 dark:text-emerald-200">
            <p className="font-medium">✓ {okMensaje}</p>
            <Link href={volverUrl} className="shrink-0 font-medium underline">
              Cerrar
            </Link>
          </div>
        )}

        {eliminarId && !referenciasEliminar && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">No se encontró el insumo a eliminar.</p>
            <p className="mt-1">Puede que ya haya sido eliminado.</p>
            <Link href={volverUrl} className="mt-2 inline-block font-medium underline">
              Volver al inventario
            </Link>
          </div>
        )}

        {eliminarId && referenciasEliminar && usosEliminar.length > 0 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-4 text-sm text-red-900 dark:text-red-200">
            <p className="font-semibold">
              No se puede eliminar «{referenciasEliminar.insumo.nombre}» (
              {referenciasEliminar.insumo.codigo})
            </p>
            <p className="mt-1">
              Está usado en {usosEliminar.join(', ')}. Para no romper el historial ni las
              recetas, desactívalo en su lugar: seguirá en el historial, pero ya no
              aparecerá en movimientos ni recetas nuevas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {referenciasEliminar.insumo.activo && (
                <form action={cambiarEstadoInsumo}>
                  <input type="hidden" name="insumoId" value={referenciasEliminar.insumo.id} />
                  <input type="hidden" name="activo" value="false" />
                  <Button type="submit" size="sm">
                    Desactivar insumo
                  </Button>
                </form>
              )}
              <Link href={volverUrl}>
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        )}

        {eliminarId && referenciasEliminar && usosEliminar.length === 0 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-4 text-sm text-red-900 dark:text-red-200">
            <p className="font-semibold">
              ¿Eliminar «{referenciasEliminar.insumo.nombre}» (
              {referenciasEliminar.insumo.codigo}) para siempre?
            </p>
            <p className="mt-1">
              No tiene recetas, movimientos ni archivos asociados, así que se puede borrar
              sin romper nada. Esta acción no se puede deshacer.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={eliminarInsumo}>
                <input type="hidden" name="insumoId" value={referenciasEliminar.insumo.id} />
                <input type="hidden" name="q" value={searchParams?.q ?? ''} />
                <Button type="submit" variant="destructive" size="sm">
                  Sí, eliminar
                </Button>
              </form>
              <Link href={volverUrl}>
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        )}

        {stockBajo.length > 0 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-4 text-sm text-red-900 dark:text-red-200">
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
            <form method="get" className="mb-4 flex flex-wrap gap-2">
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
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {busqueda
                  ? 'Ningún insumo coincide con la búsqueda.'
                  : 'Aún no hay insumos registrados. Crea el primero con el formulario de abajo.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
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
                          className={`border-b dark:border-slate-800 ${enAlerta ? 'bg-red-50 dark:bg-red-950/60' : ''} ${!item.activo ? 'opacity-60' : ''}`}
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
                              <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                Inactivo
                              </span>
                            ) : enAlerta ? (
                              <span className="rounded-full bg-red-100 dark:bg-red-950/60 px-2 py-1 text-xs font-medium text-red-800 dark:text-red-300">
                                Stock bajo
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap items-center justify-end gap-2">
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
                              <Link
                                href={`/insumos?eliminar=${item.id}${busqueda ? `&q=${encodeURIComponent(searchParams?.q ?? '')}` : ''}`}
                              >
                                <Button type="button" variant="destructive" size="sm">
                                  Eliminar
                                </Button>
                              </Link>
                            </div>
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
              Cambia nombre, código, unidad, categoría, costo unitario y stock mínimo. El
              stock actual no se edita: solo cambia con movimientos, para no perder el
              historial. Si un insumo no tiene recetas, movimientos ni archivos, se puede
              eliminar desde la tabla con confirmación; si los tiene, usa «Desactivar».
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todosInsumos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay insumos para editar.</p>
            ) : (
              <div className="space-y-3">
                {todosInsumos.map((item) => (
                  <details
                    key={item.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {item.nombre} ({item.codigo}){!item.activo ? ' — inactivo' : ''}
                    </summary>
                    <form action={editarInsumo} className="mt-4 grid gap-4 md:grid-cols-2">
                      <input type="hidden" name="insumoId" value={item.id} />
                      <input type="hidden" name="q" value={searchParams?.q ?? ''} />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Nombre
                        </label>
                        <Input name="nombre" defaultValue={item.nombre} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Código
                        </label>
                        <Input name="codigo" defaultValue={item.codigo} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Unidad
                        </label>
                        <select name="unidadMedida" className={selectClass} defaultValue={item.unidadMedida} required>
                          {UNIDADES.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Categoría
                        </label>
                        <Input name="categoria" defaultValue={item.categoria} required />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Código</label>
                  <Input name="codigo" placeholder="MEL-001" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                  <Input name="nombre" placeholder="Miel de agave" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
                  <Input name="categoria" placeholder="Azúcar" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Unidad</label>
                  <select name="unidadMedida" className={selectClass} defaultValue="KG" required>
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Costo unitario
                  </label>
                  <Input name="costoUnitario" type="number" step="0.01" min="0" placeholder="35" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Stock actual</label>
                  <Input name="stockActual" type="number" step="0.01" min="0" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Stock mínimo</label>
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Insumo</label>
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
                  <select name="tipo" className={selectClass} defaultValue="COMPRA" required>
                    {TIPOS_MOVIMIENTO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cantidad</label>
                  <Input name="cantidad" type="number" step="0.01" min="0.01" placeholder="10" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Costo unitario (opcional)
                  </label>
                  <Input name="costoUnitario" type="number" step="0.01" min="0" placeholder="Costo actual" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
