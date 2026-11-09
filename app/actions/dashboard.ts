'use server';

import { isDbConfigured, prisma } from '@/lib/prisma';

const DASHBOARD_VACIO = { insumosCount: 0, recetasCount: 0, lotesCount: 0, stockTotal: 0 };

export async function obtenerDashboard() {
  if (!isDbConfigured()) {
    return DASHBOARD_VACIO;
  }

  try {
    const [insumosCount, recetasCount, lotesCount, stockTotal] = await Promise.all([
      prisma.insumo.count(),
      prisma.receta.count(),
      prisma.loteProduccion.count(),
      prisma.productoTerminado.aggregate({
        _sum: { botellasEnStock: true },
      }),
    ]);

    return {
      insumosCount,
      recetasCount,
      lotesCount,
      stockTotal: stockTotal._sum.botellasEnStock ?? 0,
    };
  } catch (error) {
    console.error('obtenerDashboard: sin acceso a la base de datos', error);
    return DASHBOARD_VACIO;
  }
}

export async function obtenerInsumos() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.insumo.findMany({
      orderBy: { nombre: 'asc' },
    });
  } catch (error) {
    console.error('obtenerInsumos: sin acceso a la base de datos', error);
    return [];
  }
}

export async function obtenerRecetas() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.receta.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        recetaInsumos: {
          include: {
            insumo: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('obtenerRecetas: sin acceso a la base de datos', error);
    return [];
  }
}

export async function obtenerLotes() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.loteProduccion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        receta: true,
      },
    });
  } catch (error) {
    console.error('obtenerLotes: sin acceso a la base de datos', error);
    return [];
  }
}

export async function obtenerHistorialReciente() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.insumoMovimiento.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        insumo: true,
      },
      take: 8,
    });
  } catch (error) {
    console.error('obtenerHistorialReciente: sin acceso a la base de datos', error);
    return [];
  }
}
