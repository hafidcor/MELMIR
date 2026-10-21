import { prisma } from '@/lib/prisma';

export async function obtenerHistorialInsumos() {
  return prisma.insumoMovimiento.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      insumo: true,
    },
    take: 50,
  });
}

export async function obtenerHistorialProduccion() {
  return prisma.loteProduccion.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      receta: true,
    },
    take: 20,
  });
}
