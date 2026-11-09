'use server';

import { redirect } from 'next/navigation';
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

/**
 * Edita una receta existente: nombre, estilo, descripción, ABV, volumen
 * del lote y rendimiento. La descripción es opcional y puede quedar
 * vacía. Al guardar, vuelve a la lista con una confirmación clara.
 */
export async function editarReceta(formData: FormData) {
  await exigirPermiso('recetas');
  const recetaId = String(formData.get('recetaId') ?? '').trim();
  const nombre = String(formData.get('nombre') ?? '').trim();
  const estilo = String(formData.get('estilo') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  const abv = Number(formData.get('abv') ?? 0);
  const volumenLoteEstimado = Number(formData.get('volumenLoteEstimado') ?? 0);
  const rendimientoBotellas = Number(formData.get('rendimientoBotellas') ?? 0);

  if (!recetaId) {
    throw new Error('Debes indicar la receta a editar');
  }

  if (!nombre || !estilo || rendimientoBotellas <= 0) {
    throw new Error('Nombre, estilo y rendimiento son obligatorios');
  }

  if (abv < 0 || volumenLoteEstimado < 0) {
    throw new Error('El ABV y el volumen del lote deben ser 0 o mayores');
  }

  if (descripcion.length > 2000) {
    throw new Error('La descripción no puede superar los 2000 caracteres');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para editar recetas');
  }

  const receta = await prisma.receta.findUnique({ where: { id: recetaId } });
  if (!receta) {
    throw new Error('La receta no existe');
  }

  await prisma.receta.update({
    where: { id: recetaId },
    data: {
      nombre,
      estilo,
      descripcion: descripcion || null,
      abv,
      volumenLoteEstimado,
      rendimientoBotellas,
    },
  });

  revalidatePath('/recetas');
  revalidatePath('/precios');
  revalidatePath('/');
  redirect('/recetas?ok=editada');
}
