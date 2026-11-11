'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';

/** Crea las 4 etapas de un lote si aún no tiene ninguna. */
export async function crearEtapasLote(formData: FormData) {
  await exigirPermiso('produccion');
  const loteId = String(formData.get('loteId') ?? '').trim();
  if (!loteId) {
    throw new Error('Falta el lote');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para crear etapas');
  }

  const lote = await prisma.loteProduccion.findUnique({
    where: { id: loteId },
    include: { etapas: true },
  });
  if (!lote) {
    throw new Error('El lote no existe');
  }
  if (lote.etapas.length > 0) {
    throw new Error('Ese lote ya tiene etapas');
  }

  await prisma.loteEtapa.createMany({
    data: ['Fermentación', 'Trasiego', 'Clarificación', 'Embotellado'].map((nombre, i) => ({
      loteProduccionId: lote.id,
      nombre,
      orden: i + 1,
    })),
  });

  revalidatePath('/produccion');
  revalidatePath('/dashboard');
}

/**
 * Actualiza una etapa: fecha planeada y estado. Al marcarla como HECHA
 * se registra la fecha real (hoy); al sacarla de HECHA se limpia.
 */
export async function actualizarEtapa(formData: FormData) {
  await exigirPermiso('produccion');
  const etapaId = String(formData.get('etapaId') ?? '').trim();
  const estadoForm = String(formData.get('estado') ?? '').trim();
  const fechaPlaneadaForm = String(formData.get('fechaPlaneada') ?? '').trim();

  const estadosValidos = ['PENDIENTE', 'EN_CURSO', 'HECHA'] as const;
  if (!etapaId) {
    throw new Error('Falta la etapa');
  }
  if (!estadosValidos.includes(estadoForm as (typeof estadosValidos)[number])) {
    throw new Error('Estado de etapa no válido');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para actualizar etapas');
  }

  const estado = estadoForm as (typeof estadosValidos)[number];
  const etapaActual = await prisma.loteEtapa.findUnique({ where: { id: etapaId } });
  if (!etapaActual) {
    throw new Error('La etapa no existe');
  }

  await prisma.loteEtapa.update({
    where: { id: etapaId },
    data: {
      estado,
      fechaPlaneada: fechaPlaneadaForm ? new Date(fechaPlaneadaForm) : null,
      fechaReal: estado === 'HECHA' ? new Date() : null,
      // Al entrar en curso se registra cuándo empezó (solo si aún no
      // tenía inicio): sirve para decir cuántos días lleva la etapa.
      fechaInicio:
        estado === 'EN_CURSO' && !etapaActual.fechaInicio ? new Date() : undefined,
    },
  });

  revalidatePath('/produccion');
  revalidatePath('/dashboard');
}
