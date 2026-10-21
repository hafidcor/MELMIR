import { prisma } from '@/lib/prisma';
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
  const data = await calculateRecipeCost(recetaId);
  return data;
}

export async function listarProductosTerminados() {
  return prisma.productoTerminado.findMany({
    include: {
      receta: true,
    },
  });
}
