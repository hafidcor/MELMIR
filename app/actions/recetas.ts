'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';
import { calculateRecipeCost } from '@/app/lib/costeo';
import { registrarComponenteReceta } from '@/app/actions/insumos';

export async function obtenerRecetaCosto(recetaId: string) {
  if (!isDbConfigured()) {
    return { costoLote: 0, costoPorPieza: 0 };
  }

  try {
    return await calculateRecipeCost(recetaId);
  } catch (error) {
    console.error('obtenerRecetaCosto: sin acceso a la base de datos', error);
    return { costoLote: 0, costoPorPieza: 0 };
  }
}

export async function obtenerListadoRecetasConCosto() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    const recetas = await prisma.receta.findMany({
      include: {
        recetaInsumos: {
          include: {
            insumo: true,
          },
        },
      },
    });

    const items = await Promise.all(
      recetas.map(async (receta) => {
        try {
          const costo = await calculateRecipeCost(receta.id);
          return {
            ...receta,
            costoLote: costo.costoLote,
            costoPorPieza: costo.costoPorPieza,
          };
        } catch {
          return {
            ...receta,
            costoLote: 0,
            costoPorPieza: 0,
          };
        }
      })
    );

    return items;
  } catch (error) {
    console.error('obtenerListadoRecetasConCosto: sin acceso a la base de datos', error);
    return [];
  }
}

/**
 * Acción de formulario: agrega un insumo a una receta (o actualiza su
 * cantidad si ya estaba). Valida los datos y evita duplicados.
 */
export async function agregarInsumoAReceta(formData: FormData) {
  await exigirPermiso('recetas');
  const recetaId = String(formData.get('recetaId') ?? '').trim();
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const cantidad = Number(formData.get('cantidad') ?? 0);

  if (!recetaId || !insumoId) {
    throw new Error('Debes seleccionar una receta y un insumo');
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor que 0');
  }

  await registrarComponenteReceta(recetaId, insumoId, cantidad);

  revalidatePath('/recetas');
  revalidatePath('/precios');
}
