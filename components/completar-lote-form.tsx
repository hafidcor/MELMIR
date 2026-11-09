'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { completarLoteForm } from '@/app/actions/produccion';

export type InsumoRecetaParaCompletar = {
  id: string;
  nombre: string;
  unidadMedida: string;
  cantidadTeorica: number;
  costoUnitario: number;
  stockActual: number;
};

type Adicional = { concepto: string; monto: string };

/**
 * Formulario para cerrar un lote con su CONSUMO REAL.
 * Cada insumo de la receta trae su cantidad teórica prellenada y se
 * puede ajustar a lo que realmente se gastó; el costo total del lote
 * (insumos + costos adicionales) se calcula en vivo antes de confirmar.
 * Al completar, el servidor valida el stock contra las cantidades
 * reales, descuenta esas cantidades y liga cada consumo al lote.
 */
export default function CompletarLoteForm({
  loteId,
  codigoLote,
  botellasEsperadas,
  insumos,
}: {
  loteId: string;
  codigoLote: string;
  botellasEsperadas: number;
  insumos: InsumoRecetaParaCompletar[];
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const insumo of insumos) {
      inicial[insumo.id] = String(insumo.cantidadTeorica);
    }
    return inicial;
  });
  const [adicionales, setAdicionales] = useState<Adicional[]>([]);

  const costoInsumos = useMemo(() => {
    return insumos.reduce((sum, insumo) => {
      const cantidad = Number(cantidades[insumo.id] ?? 0);
      return sum + (Number.isFinite(cantidad) && cantidad > 0 ? cantidad * insumo.costoUnitario : 0);
    }, 0);
  }, [insumos, cantidades]);

  const costoAdicionales = useMemo(() => {
    return adicionales.reduce((sum, a) => {
      const monto = Number(a.monto ?? 0);
      return sum + (Number.isFinite(monto) && monto > 0 ? monto : 0);
    }, 0);
  }, [adicionales]);

  const costoTotal = costoInsumos + costoAdicionales;

  function agregarAdicional() {
    setAdicionales([...adicionales, { concepto: '', monto: '' }]);
  }

  function quitarAdicional(indice: number) {
    setAdicionales(adicionales.filter((_, i) => i !== indice));
  }

  return (
    <form action={completarLoteForm} className="mt-4 space-y-4 border-t dark:border-slate-800 pt-4">
      <input type="hidden" name="loteId" value={loteId} />
      <p className="text-sm font-semibold">Completar lote {codigoLote}</p>

      <div className="w-44">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Botellas reales
        </label>
        <Input
          name="botellasReales"
          type="number"
          min="1"
          step="1"
          placeholder={String(botellasEsperadas)}
          required
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Consumo real de insumos
        </p>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          La cantidad teórica viene prellenada. Ajusta lo que realmente gastaste en este
          lote: el costo se calcula con lo que pongas aquí y se descuenta de tu stock.
        </p>
        {insumos.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            La receta no tiene insumos registrados.
          </p>
        ) : (
          <div className="space-y-3">
            {insumos.map((insumo) => {
              const cantidadReal = Number(cantidades[insumo.id] ?? 0);
              const subtotal =
                Number.isFinite(cantidadReal) && cantidadReal > 0
                  ? cantidadReal * insumo.costoUnitario
                  : 0;
              const sinStock = Number.isFinite(cantidadReal) && cantidadReal > insumo.stockActual;
              return (
                <div
                  key={insumo.id}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3"
                >
                  <div className="min-w-32 flex-1">
                    <p className="text-sm font-medium">{insumo.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Teórica: {insumo.cantidadTeorica} {insumo.unidadMedida} · ${insumo.costoUnitario.toFixed(2)}/{insumo.unidadMedida} · Stock: {insumo.stockActual} {insumo.unidadMedida}
                    </p>
                    {sinStock ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        No alcanza el stock: hay {insumo.stockActual} {insumo.unidadMedida}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Cantidad real ({insumo.unidadMedida})
                    </label>
                    <Input
                      name={`consumo_${insumo.id}`}
                      type="number"
                      min="0"
                      step="any"
                      value={cantidades[insumo.id] ?? ''}
                      onChange={(e) =>
                        setCantidades({ ...cantidades, [insumo.id]: e.target.value })
                      }
                      className="h-10 w-32"
                    />
                  </div>
                  <p className="pb-2 text-sm font-semibold">${subtotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Costos adicionales de producción (opcional)
        </p>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Gas, mano de obra, flete u otros gastos de este lote. Se suman al costo total.
        </p>
        {adicionales.map((adicional, indice) => (
          <div key={indice} className="mb-3 flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Concepto
              </label>
              <Input
                name={`adicionalConcepto_${indice}`}
                type="text"
                placeholder="Ej. Gas"
                value={adicional.concepto}
                onChange={(e) => {
                  const copia = [...adicionales];
                  copia[indice] = { ...copia[indice], concepto: e.target.value };
                  setAdicionales(copia);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Monto ($)
              </label>
              <Input
                name={`adicionalMonto_${indice}`}
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={adicional.monto}
                onChange={(e) => {
                  const copia = [...adicionales];
                  copia[indice] = { ...copia[indice], monto: e.target.value };
                  setAdicionales(copia);
                }}
                className="h-10 w-32"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => quitarAdicional(indice)}>
              Quitar
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={agregarAdicional}>
          + Agregar costo adicional
        </Button>
      </div>

      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4">
        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Costo real del lote</p>
        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          ${costoTotal.toFixed(2)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Insumos ${costoInsumos.toFixed(2)}
          {costoAdicionales > 0 ? ` + adicionales $${costoAdicionales.toFixed(2)}` : ''}
        </p>
      </div>

      <Button type="submit" size="sm">
        Completar lote
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Al completar el lote se descuentan las cantidades reales de tu stock y se registra el
        producto terminado con este costo real. Si falta stock, el cierre se rechaza.
      </p>
    </form>
  );
}
