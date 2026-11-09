'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';

const TIPOS_SALIDA = ['PRODUCCION_CONSUMO', 'AJUSTE_SALIDA', 'MERMA'] as const;
const TIPOS_ENTRADA = ['COMPRA', 'AJUSTE_ENTRADA'] as const;
const TIPOS_VALIDOS = [...TIPOS_ENTRADA, ...TIPOS_SALIDA] as const;

export async function registrarMovimientoInsumo(formData: FormData) {
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? 'COMPRA');
  const cantidad = Number(formData.get('cantidad') ?? 0);
  const costoUnitario = Number(formData.get('costoUnitario') ?? 0);
  const referencia = String(formData.get('referencia') ?? '').trim();

  if (!insumoId || cantidad <= 0) {
    throw new Error('Debes seleccionar un insumo y una cantidad válida');
  }

  if (!(TIPOS_VALIDOS as readonly string[]).includes(tipo)) {
    throw new Error('El tipo de movimiento no es válido');
  }

  if (costoUnitario < 0) {
    throw new Error('El costo unitario no puede ser negativo');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para registrar movimientos');
  }

  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });

  if (!insumo) {
    throw new Error('El insumo no existe');
  }

  if (!insumo.activo) {
    throw new Error(`El insumo ${insumo.nombre} está inactivo y no admite movimientos`);
  }

  const stockActual = Number(insumo.stockActual);
  const esSalida = (TIPOS_SALIDA as readonly string[]).includes(tipo);
  const nuevoStock = esSalida ? stockActual - cantidad : stockActual + cantidad;

  if (nuevoStock < 0) {
    throw new Error(`Stock insuficiente de ${insumo.nombre}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.insumoMovimiento.create({
      data: {
        insumoId,
        tipo: tipo as any,
        cantidad,
        costoUnitario: Number(costoUnitario || insumo.costoUnitario),
        total: cantidad * Number(costoUnitario || insumo.costoUnitario),
        saldoAfter: nuevoStock,
        referencia: referencia || 'Movimiento manual',
      },
    });

    await tx.insumo.update({
      where: { id: insumoId },
      data: {
        stockActual: nuevoStock,
      },
    });
  });

  revalidatePath('/insumos');
  revalidatePath('/historial');
  revalidatePath('/');
}

export async function obtenerHistorialInsumos() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.insumoMovimiento.findMany({
      orderBy: { createdAt: 'desc' },
      include: { insumo: true },
      take: 50,
    });
  } catch (error) {
    console.error('obtenerHistorialInsumos: sin acceso a la base de datos', error);
    return [];
  }
}

export async function obtenerHistorialProduccion() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.loteProduccion.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { receta: true },
      take: 20,
    });
  } catch (error) {
    console.error('obtenerHistorialProduccion: sin acceso a la base de datos', error);
    return [];
  }
}
