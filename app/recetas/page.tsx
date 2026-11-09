import Link from 'next/link';

import { calculateRecipeCost } from '@/app/lib/costeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DbWarning } from '@/components/db-warning';
import { R2Warning } from '@/components/r2-warning';
import { ArchivosEntidad, ImagenPrincipal } from '@/components/archivos';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { crearReceta } from '@/app/actions/produccion';
import { agregarInsumoAReceta, editarReceta } from '@/app/actions/recetas';

export const dynamic = 'force-dynamic';

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

const textareaClass =
  'flex min-h-24 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-100 dark:ring-offset-slate-950';

export default async function RecetasPage({
  searchParams,
}: {
  searchParams?: { ok?: string };
}) {
  let recetas: Array<{
    id: string;
    nombre: string;
    estilo: string;
    descripcion: string | null;
    abv: unknown;
    volumenLoteEstimado: unknown;
    rendimientoBotellas: number;
    recetaInsumos: Array<{
      id: string;
      cantidadConsumida: unknown;
      insumo: { id: string; nombre: string; unidadMedida: string };
    }>;
  }> = [];
  let insumos: Array<{ id: string; nombre: string; unidadMedida: string }> = [];

  if (isDbConfigured()) {
    try {
      recetas = await prisma.receta.findMany({
        include: {
          recetaInsumos: {
            include: {
              insumo: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
      });
      insumos = await prisma.insumo.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      });
    } catch (error) {
      console.error('RecetasPage: sin acceso a la base de datos', error);
      recetas = [];
      insumos = [];
    }
  }

  const recetasConCosto = await Promise.all(
    recetas.map(async (receta) => {
      try {
        const costo = await calculateRecipeCost(receta.id);
        return { ...receta, costo };
      } catch {
        return {
          ...receta,
          costo: { costoLote: 0, costoPorPieza: 0 },
        };
      }
    })
  );

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />
        <R2Warning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Gestor de recetas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fórmulas de hidromiel, sus insumos y su costo por lote.
          </p>
        </header>

        {searchParams?.ok === 'editada' && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-sm text-emerald-900 dark:text-emerald-200">
            <p className="font-medium">✓ Receta actualizada correctamente.</p>
            <Link href="/recetas" className="shrink-0 font-medium underline">
              Cerrar
            </Link>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nueva receta</CardTitle>
            <CardDescription>Define la fórmula base de tu hidromiel</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={crearReceta} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                <Input name="nombre" placeholder="Hidromiel Clásica" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estilo</label>
                <Input name="estilo" placeholder="Semi Seco" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">ABV</label>
                <Input name="abv" type="number" step="0.1" placeholder="6.5" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Volumen lote</label>
                <Input name="volumenLoteEstimado" type="number" step="0.01" placeholder="60" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Botellas</label>
                <Input name="rendimientoBotellas" type="number" placeholder="120" required />
              </div>
              <div className="md:col-span-2 xl:col-span-5">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Descripción (opcional)
                </label>
                <textarea
                  name="descripcion"
                  rows={3}
                  maxLength={2000}
                  placeholder="Notas de sabor, aroma, historia de la receta…"
                  className={textareaClass}
                />
              </div>

              <div className="xl:col-span-5 flex justify-end pt-2">
                <Button type="submit">Guardar receta</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {recetasConCosto.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay recetas registradas. Crea la primera con el formulario de arriba.
              </p>
            </CardContent>
          </Card>
        )}

        {recetasConCosto.map((receta) => (
          <Card key={receta.id}>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{receta.nombre}</CardTitle>
                <CardDescription>
                  {receta.estilo} · {receta.rendimientoBotellas} botellas · ABV{' '}
                  {Number(receta.abv ?? 0).toFixed(1)}%
                </CardDescription>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Costo del lote: ${receta.costo.costoLote.toFixed(2)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3">
                  <ImagenPrincipal
                    entidad="RECETA"
                    entidadId={receta.id}
                    alt={`Foto de ${receta.nombre}`}
                  />
                  {receta.descripcion && (
                    <p className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {receta.descripcion}
                    </p>
                  )}
                  {receta.recetaInsumos.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Esta receta aún no tiene insumos. Agrégalos con el formulario de abajo.
                    </p>
                  )}
                  {receta.recetaInsumos.map((ri) => (
                    <div key={ri.id} className="flex justify-between border-b dark:border-slate-800 pb-2 text-sm">
                      <span>{ri.insumo.nombre}</span>
                      <span>
                        {Number(ri.cantidadConsumida)} {ri.insumo.unidadMedida}
                      </span>
                    </div>
                  ))}

                  <form action={agregarInsumoAReceta} className="flex flex-wrap items-end gap-3 pt-3">
                    <input type="hidden" name="recetaId" value={receta.id} />
                    <div className="min-w-48 flex-1">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Agregar insumo
                      </label>
                      <select name="insumoId" className={selectClass} defaultValue="" required>
                        <option value="" disabled>
                          Selecciona un insumo
                        </option>
                        {insumos.map((insumo) => (
                          <option key={insumo.id} value={insumo.id}>
                            {insumo.nombre} ({insumo.unidadMedida})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cantidad</label>
                      <Input name="cantidad" type="number" step="0.01" min="0.01" placeholder="12" required />
                    </div>
                    <Button type="submit" size="sm">
                      Agregar a la receta
                    </Button>
                  </form>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo del lote</p>
                      <p className="text-2xl font-bold">${receta.costo.costoLote.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo por pieza</p>
                      <p className="text-xl font-semibold">${receta.costo.costoPorPieza.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Rendimiento</p>
                      <p className="text-lg font-medium">{receta.rendimientoBotellas} botellas</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ArchivosEntidad
                  entidad="RECETA"
                  entidadId={receta.id}
                  titulo="Foto y archivos de la receta"
                  descripcion="Foto del producto y documentos guardados en Cloudflare R2. La primera imagen subida se muestra como foto principal."
                />
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Editar receta
                </summary>
                <form action={editarReceta} className="mt-4 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="recetaId" value={receta.id} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nombre
                    </label>
                    <Input name="nombre" defaultValue={receta.nombre} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Estilo
                    </label>
                    <Input name="estilo" defaultValue={receta.estilo} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      ABV
                    </label>
                    <Input
                      name="abv"
                      type="number"
                      step="0.1"
                      min="0"
                      defaultValue={Number(receta.abv ?? 0)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Volumen lote
                    </label>
                    <Input
                      name="volumenLoteEstimado"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(receta.volumenLoteEstimado ?? 0)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Botellas
                    </label>
                    <Input
                      name="rendimientoBotellas"
                      type="number"
                      min="1"
                      defaultValue={receta.rendimientoBotellas}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Descripción (opcional)
                    </label>
                    <textarea
                      name="descripcion"
                      rows={3}
                      maxLength={2000}
                      placeholder="Notas de sabor, aroma, historia de la receta…"
                      defaultValue={receta.descripcion ?? ''}
                      className={textareaClass}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end pt-2">
                    <Button type="submit" size="sm">
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
