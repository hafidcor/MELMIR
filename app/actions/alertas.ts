'use server';

import { isDbConfigured, prisma } from '@/lib/prisma';

/** Insumos activos con stock en o por debajo de su mínimo. */
export async function obtenerInsumosStockBajo(): Promise<
  Array<{ id: string; nombre: string; stockActual: number; stockMinimo: number; unidadMedida: string }>
> {
  if (!isDbConfigured()) {
    return [];
  }
  try {
    const insumos = await prisma.insumo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    return insumos
      .filter((i) => Number(i.stockActual) <= Number(i.stockMinimo))
      .map((i) => ({
        id: i.id,
        nombre: i.nombre,
        stockActual: Number(i.stockActual),
        stockMinimo: Number(i.stockMinimo),
        unidadMedida: i.unidadMedida,
      }));
  } catch (error) {
    console.error('obtenerInsumosStockBajo: sin acceso a la base de datos', error);
    return [];
  }
}

/** Contador de alertas de stock bajo para el menú. */
export async function obtenerConteoAlertasStock(): Promise<number> {
  return (await obtenerInsumosStockBajo()).length;
}

export type EtapaProxima = {
  id: string;
  nombre: string;
  estado: string;
  fechaPlaneada: Date | null;
  vencida: boolean;
  loteCodigo: string;
  recetaNombre: string;
};

/**
 * Etapas no terminadas: vencidas (fecha planeada pasada) y las que
 * vencen en los próximos 7 días. Las etapas sin fecha planeada no
 * aparecen aquí hasta que se les asigne una.
 */
export async function obtenerProximasEtapas(): Promise<EtapaProxima[]> {
  if (!isDbConfigured()) {
    return [];
  }
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 7);

    const etapas = await prisma.loteEtapa.findMany({
      where: {
        estado: { not: 'HECHA' },
        fechaPlaneada: { not: null, lte: limite },
      },
      include: { loteProduccion: { include: { receta: true } } },
      orderBy: { fechaPlaneada: 'asc' },
    });

    return etapas.map((etapa) => ({
      id: etapa.id,
      nombre: etapa.nombre,
      estado: etapa.estado,
      fechaPlaneada: etapa.fechaPlaneada,
      vencida: etapa.fechaPlaneada ? etapa.fechaPlaneada < hoy : false,
      loteCodigo: etapa.loteProduccion.codigoLote,
      recetaNombre: etapa.loteProduccion.receta.nombre,
    }));
  } catch (error) {
    console.error('obtenerProximasEtapas: sin acceso a la base de datos', error);
    return [];
  }
}
