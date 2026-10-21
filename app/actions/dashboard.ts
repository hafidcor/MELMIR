import { prisma } from '@/lib/prisma';

export async function obtenerDashboard() {
  const [insumosCount, recetasCount, lotesCount, stockTotal] = await Promise.all([
    prisma.insumo.count(),
    prisma.receta.count(),
    prisma.loteProduccion.count(),
    prisma.productoTerminado.aggregate({
      _sum: { botellasEnStock: true },
    }),
  ]);

  return {
    insumosCount,
    recetasCount,
    lotesCount,
    stockTotal: stockTotal._sum.botellasEnStock ?? 0,
  };
}

export async function obtenerInsumos() {
  return prisma.insumo.findMany({
    orderBy: { nombre: 'asc' },
  });
}

export async function obtenerRecetas() {
  return prisma.receta.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      recetaInsumos: {
        include: {
          insumo: true,
        },
      },
    },
  });
}

export async function obtenerLotes() {
  return prisma.loteProduccion.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      receta: true,
    },
  });
}

export async function obtenerHistorialReciente() {
  return prisma.insumoMovimiento.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      insumo: true,
    },
    take: 8,
  });
}
