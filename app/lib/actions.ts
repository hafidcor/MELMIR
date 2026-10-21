import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function crearInsumo(formData: FormData) {
  const data = {
    codigo: String(formData.get('codigo') ?? ''),
    nombre: String(formData.get('nombre') ?? ''),
    categoria: String(formData.get('categoria') ?? ''),
    unidadMedida: String(formData.get('unidadMedida') ?? 'KG'),
    costoUnitario: Number(formData.get('costoUnitario') ?? 0),
    stockActual: Number(formData.get('stockActual') ?? 0),
    stockMinimo: Number(formData.get('stockMinimo') ?? 0),
  };

  await prisma.insumo.create({
    data: {
      ...data,
      unidadMedida: data.unidadMedida as any,
    },
  });

  revalidatePath('/insumos');
}

export async function crearReceta(formData: FormData) {
  await prisma.receta.create({
    data: {
      nombre: String(formData.get('nombre') ?? ''),
      estilo: String(formData.get('estilo') ?? ''),
      abv: Number(formData.get('abv') ?? 0),
      volumenLoteEstimado: Number(formData.get('volumenLoteEstimado') ?? 0),
      rendimientoBotellas: Number(formData.get('rendimientoBotellas') ?? 0),
    },
  });

  revalidatePath('/recetas');
}
