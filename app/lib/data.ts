import { prisma } from '@/lib/prisma';
import { calculateRecipeCost } from '@/app/lib/costeo';

export async function obtenerRecetaCosto(recetaId: string) {
  return calculateRecipeCost(recetaId);
}

export async function obtenerInsumos() {
  return prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
}

export async function obtenerRecetas() {
  return prisma.receta.findMany({
    orderBy: { nombre: 'asc' },
    include: { recetaInsumos: { include: { insumo: true } } },
  });
}

export async function obtenerLotes() {
  return prisma.loteProduccion.findMany({
    orderBy: { createdAt: 'desc' },
    include: { receta: true },
  });
}
