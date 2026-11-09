import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DbWarning } from '@/components/db-warning';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { calculateRecipeCost } from '@/app/lib/costeo';
import { calcularPrecioVenta } from '@/app/lib/precios';

export const dynamic = 'force-dynamic';

const IEPS = 0.08;
const IVA = 0.16;
const MARGEN = 0.3;

export default async function PreciosPage() {
  let recetas: Array<{
    id: string;
    nombre: string;
    estilo: string;
    rendimientoBotellas: number;
  }> = [];
  let productos: Array<{
    id: string;
    botellasEnStock: number;
    costoUnitarioBotella: unknown;
    receta: { nombre: string };
    loteProduccion: { codigoLote: string };
  }> = [];

  if (isDbConfigured()) {
    try {
      recetas = await prisma.receta.findMany({ orderBy: { nombre: 'asc' } });
      productos = await prisma.productoTerminado.findMany({
        include: { receta: true, loteProduccion: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('PreciosPage: sin acceso a la base de datos', error);
      recetas = [];
      productos = [];
    }
  }

  const recetasConPrecio = await Promise.all(
    recetas.map(async (receta) => {
      let costoLote = 0;
      let costoPorPieza = 0;
      try {
        const costo = await calculateRecipeCost(receta.id);
        costoLote = costo.costoLote;
        costoPorPieza = costo.costoPorPieza;
      } catch {
        costoLote = 0;
        costoPorPieza = 0;
      }

      const precio = calcularPrecioVenta({
        costoUnitario: costoPorPieza,
        ieps: IEPS,
        iva: IVA,
        margen: MARGEN,
      });

      return { ...receta, costoLote, costoPorPieza, precio };
    })
  );

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Precios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Precio sugerido por botella: costo + IEPS 8% + IVA 16% + margen 30%.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Precio sugerido por receta</CardTitle>
            <CardDescription>
              Costo teórico del lote y por pieza según los insumos de cada receta, con
              impuestos y margen aplicados. Es una referencia: el costo real de cada
              lote depende de lo que realmente se gastó en su producción.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recetasConPrecio.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay recetas para calcular precios. Crea una en{' '}
                <Link href="/recetas" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                  Recetas
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-4">
                {recetasConPrecio.map((receta) => (
                  <div key={receta.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{receta.nombre}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {receta.estilo} · {receta.rendimientoBotellas} botellas por lote
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Precio sugerido</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                          ${receta.precio.precioFinal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
                      <div>
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo teórico del lote (receta)</p>
                        <p className="font-semibold">${receta.costoLote.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo teórico / pieza (receta)</p>
                        <p className="font-semibold">${receta.costoPorPieza.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">IEPS 8%</p>
                        <p className="font-semibold">${receta.precio.impuestoIEPS.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">IVA 16%</p>
                        <p className="font-semibold">${receta.precio.impuestoIva.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Margen 30%</p>
                        <p className="font-semibold">${receta.precio.ganancia.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Productos terminados en stock</CardTitle>
              <CardDescription>
                Costo unitario real del lote y precio sugerido por botella en inventario.
              </CardDescription>
            </div>
            <Link href="/produccion">
              <Button variant="outline" size="sm">
                Ir a producción
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {productos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay producto terminado en stock. Completa un lote en Producción para
                verlo aquí.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3">Receta</th>
                      <th className="py-2 pr-3">Lote</th>
                      <th className="py-2 pr-3 text-right">Botellas</th>
                      <th className="py-2 pr-3 text-right">Costo unitario real</th>
                      <th className="py-2 text-right">Precio sugerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((producto) => {
                      const costoUnitario = Number(producto.costoUnitarioBotella);
                      const precio = calcularPrecioVenta({
                        costoUnitario,
                        ieps: IEPS,
                        iva: IVA,
                        margen: MARGEN,
                      });
                      return (
                        <tr key={producto.id} className="border-b dark:border-slate-800">
                          <td className="py-2 pr-3 font-medium">{producto.receta.nombre}</td>
                          <td className="py-2 pr-3">{producto.loteProduccion.codigoLote}</td>
                          <td className="py-2 pr-3 text-right">{producto.botellasEnStock}</td>
                          <td className="py-2 pr-3 text-right">${costoUnitario.toFixed(2)}</td>
                          <td className="py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                            ${precio.precioFinal.toFixed(2)}
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
      </div>
    </main>
  );
}
