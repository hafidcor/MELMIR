'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';

const UNIDADES_VALIDAS = ['L', 'ML', 'KG', 'G', 'PZA', 'BOTELLA'] as const;

function urlInsumos(q: string | null, ok?: string): string {
  const params = new URLSearchParams();
  if (q) {
    params.set('q', q);
  }
  if (ok) {
    params.set('ok', ok);
  }
  const query = params.toString();
  return query ? `/insumos?${query}` : '/insumos';
}

export async function registrarComponenteReceta(recetaId: string, insumoId: string, cantidad: number) {
  await exigirPermiso('insumos');
  if (!recetaId || !insumoId) {
    throw new Error('Debes indicar la receta y el insumo');
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor que 0');
  }

  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });
  if (!insumo) {
    throw new Error('El insumo no existe');
  }
  if (!insumo.activo) {
    throw new Error(`El insumo ${insumo.nombre} está inactivo y no se puede agregar a recetas`);
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
 * Referencias que impiden borrar un insumo: recetas donde aparece,
 * movimientos de inventario y archivos guardados en R2. La página de
 * Insumos usa esto para mostrar el aviso antes de confirmar el borrado.
 */
export async function obtenerReferenciasInsumo(insumoId: string): Promise<{
  insumo: { id: string; nombre: string; codigo: string; activo: boolean };
  recetas: string[];
  movimientos: number;
  archivos: number;
} | null> {
  if (!isDbConfigured()) {
    return null;
  }

  try {
    const insumo = await prisma.insumo.findUnique({
      where: { id: insumoId },
      select: { id: true, nombre: true, codigo: true, activo: true },
    });
    if (!insumo) {
      return null;
    }

    const [recetaInsumos, movimientos, archivos] = await Promise.all([
      prisma.recetaInsumo.findMany({
        where: { insumoId },
        select: { receta: { select: { nombre: true } } },
      }),
      prisma.insumoMovimiento.count({ where: { insumoId } }),
      prisma.archivo.count({ where: { entidad: 'INSUMO', entidadId: insumoId } }),
    ]);

    return {
      insumo,
      recetas: Array.from(new Set(recetaInsumos.map((ri) => ri.receta.nombre))),
      movimientos,
      archivos,
    };
  } catch (error) {
    console.error('obtenerReferenciasInsumo: sin acceso a la base de datos', error);
    return null;
  }
}

/**
 * Edita los datos de un insumo existente: nombre, código, unidad,
 * categoría, costo unitario y stock mínimo. El stock actual no se edita
 * aquí: solo cambia con movimientos registrados, para no perder el
 * historial. Al guardar, vuelve a la lista con una confirmación clara.
 */
export async function editarInsumo(formData: FormData) {
  await exigirPermiso('insumos');
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const nombre = String(formData.get('nombre') ?? '').trim();
  const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase();
  const unidadMedida = String(formData.get('unidadMedida') ?? '').trim();
  const categoria = String(formData.get('categoria') ?? '').trim();
  const costoUnitario = Number(formData.get('costoUnitario') ?? 0);
  const stockMinimo = Number(formData.get('stockMinimo') ?? 0);
  const q = String(formData.get('q') ?? '').trim() || null;

  if (!insumoId) {
    throw new Error('Debes indicar el insumo a editar');
  }

  if (!nombre) {
    throw new Error('El nombre es obligatorio');
  }

  if (!codigo) {
    throw new Error('El código es obligatorio');
  }

  if (!(UNIDADES_VALIDAS as readonly string[]).includes(unidadMedida)) {
    throw new Error('La unidad no es válida');
  }

  if (!categoria) {
    throw new Error('La categoría es obligatoria');
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

  const codigoEnUso = await prisma.insumo.findFirst({
    where: { codigo, id: { not: insumoId } },
    select: { id: true },
  });
  if (codigoEnUso) {
    throw new Error(`Ya existe otro insumo con el código ${codigo}`);
  }

  await prisma.insumo.update({
    where: { id: insumoId },
    data: {
      nombre,
      codigo,
      unidadMedida: unidadMedida as (typeof UNIDADES_VALIDAS)[number],
      categoria,
      costoUnitario,
      stockMinimo,
    },
  });

  revalidatePath('/insumos');
  revalidatePath('/recetas');
  revalidatePath('/precios');
  revalidatePath('/');
  redirect(urlInsumos(q, 'editado'));
}

/**
 * Borra un insumo de verdad (hard delete). Solo ADMIN y OPERADOR
 * (permiso 'insumos'); CONSULTA y VENDEDOR se bloquean en exigirPermiso.
 * Se rechaza si el insumo está referenciado en alguna receta, tiene
 * movimientos de inventario o archivos guardados: en esos casos el
 * camino es desactivarlo para conservar el historial.
 */
export async function eliminarInsumo(formData: FormData) {
  await exigirPermiso('insumos');
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const q = String(formData.get('q') ?? '').trim() || null;

  if (!insumoId) {
    throw new Error('Debes indicar el insumo a eliminar');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para eliminar insumos');
  }

  const referencias = await obtenerReferenciasInsumo(insumoId);
  if (!referencias) {
    throw new Error('El insumo no existe');
  }

  const usos: string[] = [];
  if (referencias.recetas.length > 0) {
    usos.push(
      `en ${referencias.recetas.length === 1 ? 'la receta' : 'las recetas'} ${referencias.recetas
        .map((r) => `«${r}»`)
        .join(', ')}`
    );
  }
  if (referencias.movimientos > 0) {
    usos.push(
      `${referencias.movimientos} movimiento(s) de inventario`
    );
  }
  if (referencias.archivos > 0) {
    usos.push(`${referencias.archivos} archivo(s) guardado(s)`);
  }

  if (usos.length > 0) {
    throw new Error(
      `No se puede eliminar «${referencias.insumo.nombre}» porque está usado ${usos.join(', ')}. Desactívalo en su lugar para conservar el historial.`
    );
  }

  await prisma.insumo.delete({ where: { id: insumoId } });

  revalidatePath('/insumos');
  revalidatePath('/recetas');
  revalidatePath('/precios');
  revalidatePath('/');
  redirect(urlInsumos(q, 'eliminado'));
}

/**
 * Desactiva o reactiva un insumo. La desactivación es el camino para
 * retirar un insumo que ya tiene movimientos, recetas o archivos
 * asociados: no se puede borrar en esos casos, para no romper el
 * historial ni las recetas. Un insumo desactivado ya no aparece en los
 * formularios de movimientos ni de recetas.
 */
export async function cambiarEstadoInsumo(formData: FormData) {
  await exigirPermiso('insumos');
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
