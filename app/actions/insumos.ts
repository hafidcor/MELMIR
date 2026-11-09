'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function registrarComponenteReceta(recetaId: string, insumoId: string, cantidad: number) {
  if (!recetaId || !insumoId) {
    throw new Error('Debes indicar la receta y el insumo');
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor que 0');
  }

  // Upsert: si el insumo ya está en la receta, actualiza su cantidad
  // en lugar de fallar por la clave única (recetaId, insumoId).
  await prisma.recetaInsumo.upsert({
    where: { recetaId_insumoId: { recetaId, insumoId } },
    update: { cantidadConsumida: cantidad },
    create: {
      recetaId,
      insumoId,
      cantidadConsumida: cantidad,
    },
  });

  revalidatePath('/recetas');
}
