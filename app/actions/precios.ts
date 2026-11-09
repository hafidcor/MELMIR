'use server';

import { isDbConfigured, prisma } from '@/lib/prisma';
import { calculateRecipeCost } from '@/app/lib/costeo';

export async function obtenerPrecioCalculado(costoUnitario: number) {
  return {
    costoBase: costoUnitario,
    ieps: costoUnitario * 0.08,
    iva: (costoUnitario + costoUnitario * 0.08) * 0.16,
    margen: ((costoUnitario + costoUnitario * 0.08) * 1.16) * 0.3,
  };
}

export async function obtenerMetricaReceta(recetaId: string) {
  if (!isDbConfigured()) {
    return { costoLote: 0, costoPorPieza: 0 };
  }

  try {
    return await calculateRecipeCost(recetaId);
  } catch (error) {
    console.error('obtenerMetricaReceta: sin acceso a la base de datos', error);
    return { costoLote: 0, costoPorPieza: 0 };
  }
}

export async function listarProductosTerminados() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.productoTerminado.findMany({
      include: {
        receta: true,
      },
    });
  } catch (error) {
    console.error('listarProductosTerminados: sin acceso a la base de datos', error);
    return [];
  }
}
