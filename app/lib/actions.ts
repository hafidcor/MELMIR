'use server';

import { prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function crearInsumo(formData: FormData) {
  await exigirPermiso('insumos');
  const codigo = String(formData.get('codigo') ?? '').trim();
  const nombre = String(formData.get('nombre') ?? '').trim();
  const categoria = String(formData.get('categoria') ?? '').trim();
  const unidadMedida = String(formData.get('unidadMedida') ?? 'KG');
  const costoUnitario = Number(formData.get('costoUnitario') ?? 0);
  const stockActual = Number(formData.get('stockActual') ?? 0);
  const stockMinimo = Number(formData.get('stockMinimo') ?? 0);

  if (!codigo || !nombre || !categoria) {
    throw new Error('El código, el nombre y la categoría son obligatorios');
  }

  if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
    throw new Error('El costo unitario debe ser 0 o mayor');
  }

  if (!Number.isFinite(stockActual) || stockActual < 0) {
    throw new Error('El stock actual debe ser 0 o mayor');
  }

  if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
    throw new Error('El stock mínimo debe ser 0 o mayor');
  }

  try {
    await prisma.insumo.create({
      data: {
        codigo,
        nombre,
        categoria,
        unidadMedida: unidadMedida as any,
        costoUnitario,
        stockActual,
        stockMinimo,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new Error(`Ya existe un insumo con el código ${codigo}`);
    }
    throw error;
  }

  revalidatePath('/insumos');
}

export async function crearReceta(formData: FormData) {
  await exigirPermiso('recetas');
  const nombre = String(formData.get('nombre') ?? '').trim();
  const estilo = String(formData.get('estilo') ?? '').trim();
  const abv = Number(formData.get('abv') ?? 0);
  const volumenLoteEstimado = Number(formData.get('volumenLoteEstimado') ?? 0);
  const rendimientoBotellas = Number(formData.get('rendimientoBotellas') ?? 0);

  if (!nombre || !estilo || rendimientoBotellas <= 0) {
    throw new Error('Nombre, estilo y rendimiento son obligatorios');
  }

  await prisma.receta.create({
    data: {
      nombre,
      estilo,
      abv,
      volumenLoteEstimado,
      rendimientoBotellas,
    },
  });

  revalidatePath('/recetas');
}
