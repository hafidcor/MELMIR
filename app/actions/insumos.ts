'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';

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

/**
 * Edita los datos de un insumo existente: nombre, categoría, costo
 * unitario y stock mínimo. El código y el stock actual no se editan aquí:
 * el código es la identidad del insumo y el stock solo cambia con
 * movimientos registrados, para no perder el historial.
 */
export async function editarInsumo(formData: FormData) {
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const nombre = String(formData.get('nombre') ?? '').trim();
  const categoria = String(formData.get('categoria') ?? '').trim();
  const costoUnitario = Number(formData.get('costoUnitario') ?? 0);
  const stockMinimo = Number(formData.get('stockMinimo') ?? 0);

  if (!insumoId) {
    throw new Error('Debes indicar el insumo a editar');
  }

  if (!nombre || !categoria) {
    throw new Error('El nombre y la categoría son obligatorios');
  }

  if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
    throw new Error('El costo unitario debe ser 0 o mayor');
  }

  if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
    throw new Error('El stock mínimo debe ser 0 o mayor');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para editar insumos');
  }

  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });

  if (!insumo) {
    throw new Error('El insumo no existe');
  }

  await prisma.insumo.update({
    where: { id: insumoId },
    data: { nombre, categoria, costoUnitario, stockMinimo },
  });

  revalidatePath('/insumos');
  revalidatePath('/recetas');
  revalidatePath('/precios');
  revalidatePath('/');
}

/**
 * Desactiva o reactiva un insumo. La desactivación es el camino para
 * retirar un insumo que ya tiene movimientos o recetas asociadas: no se
 * permite borrar insumos, para no romper el historial ni las recetas.
 * Un insumo desactivado ya no aparece en los formularios de movimientos
 * ni de recetas.
 */
export async function cambiarEstadoInsumo(formData: FormData) {
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const activo = String(formData.get('activo') ?? '') === 'true';

  if (!insumoId) {
    throw new Error('Debes indicar el insumo');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para cambiar el estado del insumo');
  }

  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });

  if (!insumo) {
    throw new Error('El insumo no existe');
  }

  await prisma.insumo.update({
    where: { id: insumoId },
    data: { activo },
  });

  revalidatePath('/insumos');
  revalidatePath('/recetas');
  revalidatePath('/');
}
