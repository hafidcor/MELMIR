import { prisma } from '@/lib/prisma';

export async function registrarComponenteReceta(recetaId: string, insumoId: string, cantidad: number) {
  await prisma.recetaInsumo.create({
    data: {
      recetaId,
      insumoId,
      cantidadConsumida: cantidad,
    },
  });
}
