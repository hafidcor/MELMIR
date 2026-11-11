'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';
import {
  calcularSeguimientoLote,
  type LoteSeguimientoInput,
  type RecomendacionLote,
} from '@/app/lib/seguimiento';

const TIPOS_NOTA = ['NOTA', 'PROBLEMA'] as const;

/**
 * Agrega una nota o reporta un problema en un lote. Un problema puede
 * ligarse a un ingrediente (insumoId) o a una parte del proceso
 * (etapa, nombre libre). Solo ADMIN y OPERADOR (permiso produccion).
 */
export async function crearNotaLote(formData: FormData) {
  await exigirPermiso('produccion');
  const loteId = String(formData.get('loteId') ?? '').trim();
  const tipoForm = String(formData.get('tipo') ?? 'NOTA').trim().toUpperCase();
  const texto = String(formData.get('texto') ?? '').trim();
  const insumoId = String(formData.get('insumoId') ?? '').trim();
  const etapa = String(formData.get('etapa') ?? '').trim();

  if (!loteId) {
    throw new Error('Falta el lote');
  }
  if (!TIPOS_NOTA.includes(tipoForm as (typeof TIPOS_NOTA)[number])) {
    throw new Error('Tipo de nota no válido');
  }
  if (!texto) {
    throw new Error('Escribe la nota o el problema');
  }
  if (texto.length > 2000) {
    throw new Error('La nota no puede superar 2000 caracteres');
  }
  if (etapa.length > 100) {
    throw new Error('La etapa no puede superar 100 caracteres');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para guardar notas');
  }

  const lote = await prisma.loteProduccion.findUnique({ where: { id: loteId } });
  if (!lote) {
    throw new Error('El lote no existe');
  }

  let insumo: { id: string } | null = null;
  if (insumoId) {
    insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) {
      throw new Error('El insumo no existe');
    }
  }

  await prisma.notaLote.create({
    data: {
      loteProduccionId: lote.id,
      tipo: tipoForm as (typeof TIPOS_NOTA)[number],
      texto,
      insumoId: insumo ? insumo.id : null,
      etapa: etapa || null,
    },
  });

  revalidatePath('/produccion');
  revalidatePath('/dashboard');
}

/**
 * Marca un problema como resuelto (o lo reabre). Solo para notas de
 * tipo PROBLEMA. Solo ADMIN y OPERADOR (permiso produccion).
 */
export async function cambiarResueltoNota(formData: FormData) {
  await exigirPermiso('produccion');
  const notaId = String(formData.get('notaId') ?? '').trim();
  const resuelto = String(formData.get('resuelto') ?? '') === 'true';

  if (!notaId) {
    throw new Error('Falta la nota');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para actualizar notas');
  }

  const nota = await prisma.notaLote.findUnique({ where: { id: notaId } });
  if (!nota) {
    throw new Error('La nota no existe');
  }
  if (nota.tipo !== 'PROBLEMA') {
    throw new Error('Solo los problemas se pueden marcar como resueltos');
  }

  await prisma.notaLote.update({
    where: { id: notaId },
    data: { resuelto },
  });

  revalidatePath('/produccion');
  revalidatePath('/dashboard');
}

export type EtapaSeguimientoDashboard = {
  id: string;
  nombre: string;
  loteCodigo: string;
  recetaNombre: string;
  fechaPlaneada: Date | null;
  dias: number | null;
  vencida: boolean;
};

export type ProblemaSeguimientoDashboard = {
  id: string;
  texto: string;
  loteCodigo: string;
  recetaNombre: string;
  insumoNombre: string | null;
  etapa: string | null;
  createdAt: Date;
};

export type LoteListoDashboard = {
  id: string;
  codigoLote: string;
  recetaNombre: string;
  motivo: string;
  botellasEnStock: number;
};

export type SeguimientoDashboard = {
  etapasVencidas: EtapaSeguimientoDashboard[];
  etapasPorVencer: EtapaSeguimientoDashboard[];
  problemasAbiertos: ProblemaSeguimientoDashboard[];
  lotesListos: LoteListoDashboard[];
  /** Recomendaciones urgentes de todos los lotes (máx. 5). */
  recomendacionesUrgentes: Array<{ loteCodigo: string; mensaje: string }>;
};

/**
 * Datos de la sección "Seguimiento de lotes" del Dashboard: etapas
 * vencidas sin hacer, etapas que vencen en los próximos 3 días,
 * problemas abiertos por lote y lotes listos (etapas hechas sin cerrar,
 * o completados sin ventas). Sin base de datos devuelve todo vacío.
 */
export async function obtenerSeguimientoDashboard(): Promise<SeguimientoDashboard> {
  const vacio: SeguimientoDashboard = {
    etapasVencidas: [],
    etapasPorVencer: [],
    problemasAbiertos: [],
    lotesListos: [],
    recomendacionesUrgentes: [],
  };
  if (!isDbConfigured()) {
    return vacio;
  }

  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite3d = new Date(hoy);
    limite3d.setDate(limite3d.getDate() + 3);

    const lotes = await prisma.loteProduccion.findMany({
      include: {
        receta: { include: { recetaInsumos: { include: { insumo: true } } } },
        etapas: { orderBy: { orden: 'asc' } },
        notas: { include: { insumo: true }, orderBy: { createdAt: 'asc' } },
        productoTerminado: {
          include: {
            _count: { select: { ventas: true } },
            ventas: { select: { botellasVendidas: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const etapasVencidas: EtapaSeguimientoDashboard[] = [];
    const etapasPorVencer: EtapaSeguimientoDashboard[] = [];
    const problemasAbiertos: ProblemaSeguimientoDashboard[] = [];
    const lotesListos: LoteListoDashboard[] = [];
    const recomendacionesUrgentes: Array<{ loteCodigo: string; mensaje: string }> = [];

    for (const lote of lotes) {
      const ventas = lote.productoTerminado?._count.ventas ?? 0;
      const botellasVendidas = (lote.productoTerminado?.ventas ?? []).reduce(
        (sum, v) => sum + v.botellasVendidas,
        0
      );
      const input: LoteSeguimientoInput = {
        id: lote.id,
        codigoLote: lote.codigoLote,
        estado: lote.estado,
        recetaNombre: lote.receta.nombre,
        etapas: lote.etapas.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          orden: e.orden,
          estado: e.estado,
          fechaPlaneada: e.fechaPlaneada,
          fechaReal: e.fechaReal,
          fechaInicio: e.fechaInicio,
        })),
        notas: lote.notas.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          texto: n.texto,
          insumoId: n.insumoId,
          insumoNombre: n.insumo ? n.insumo.nombre : null,
          etapa: n.etapa,
          resuelto: n.resuelto,
          createdAt: n.createdAt,
        })),
        insumosReceta: lote.receta.recetaInsumos.map((ri) => ({
          insumoId: ri.insumo.id,
          nombre: ri.insumo.nombre,
          cantidadTeorica: Number(ri.cantidadConsumida),
          stockActual: Number(ri.insumo.stockActual),
          unidadMedida: ri.insumo.unidadMedida,
        })),
        botellasEnStock: lote.productoTerminado?.botellasEnStock ?? 0,
        ventasCount: ventas,
        botellasVendidas,
      };
      const seguimiento = calcularSeguimientoLote(input, hoy);

      for (const etapa of seguimiento.etapasVencidas) {
        etapasVencidas.push({
          id: etapa.id,
          nombre: etapa.nombre,
          loteCodigo: lote.codigoLote,
          recetaNombre: lote.receta.nombre,
          fechaPlaneada: etapa.fechaPlaneada,
          dias: etapa.fechaPlaneada
            ? Math.round(
                (hoy.getTime() - etapa.fechaPlaneada.getTime()) / (24 * 60 * 60 * 1000)
              )
            : null,
          vencida: true,
        });
      }
      for (const etapa of seguimiento.etapasPorVencer) {
        etapasPorVencer.push({
          id: etapa.id,
          nombre: etapa.nombre,
          loteCodigo: lote.codigoLote,
          recetaNombre: lote.receta.nombre,
          fechaPlaneada: etapa.fechaPlaneada,
          dias: etapa.fechaPlaneada
            ? Math.round(
                (etapa.fechaPlaneada.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000)
              )
            : null,
          vencida: false,
        });
      }
      for (const problema of seguimiento.problemasAbiertos) {
        problemasAbiertos.push({
          id: problema.id,
          texto: problema.texto,
          loteCodigo: lote.codigoLote,
          recetaNombre: lote.receta.nombre,
          insumoNombre: problema.insumoNombre,
          etapa: problema.etapa,
          createdAt: problema.createdAt,
        });
      }

      // Lotes listos: abiertos con todas las etapas hechas, o
      // completados con botellas en stock y sin ventas.
      const abierto = lote.estado === 'PENDIENTE' || lote.estado === 'EN_PRODUCCION';
      if (
        abierto &&
        seguimiento.etapasTotal > 0 &&
        seguimiento.etapasHechas === seguimiento.etapasTotal
      ) {
        lotesListos.push({
          id: lote.id,
          codigoLote: lote.codigoLote,
          recetaNombre: lote.receta.nombre,
          motivo: 'Todas las etapas hechas: listo para cerrar y embotellar.',
          botellasEnStock: lote.productoTerminado?.botellasEnStock ?? 0,
        });
      } else if (
        lote.estado === 'COMPLETADO' &&
        (lote.productoTerminado?.botellasEnStock ?? 0) > 0 &&
        ventas === 0
      ) {
        lotesListos.push({
          id: lote.id,
          codigoLote: lote.codigoLote,
          recetaNombre: lote.receta.nombre,
          motivo: 'Completado sin ventas: listo para vender.',
          botellasEnStock: lote.productoTerminado?.botellasEnStock ?? 0,
        });
      }

      for (const rec of seguimiento.recomendaciones) {
        if (rec.nivel === 'urgente' && recomendacionesUrgentes.length < 5) {
          recomendacionesUrgentes.push({ loteCodigo: lote.codigoLote, mensaje: rec.mensaje });
        }
      }
    }

    // Orden: vencidas por fecha, por vencer por fecha, problemas por fecha.
    etapasVencidas.sort(
      (a, b) => (a.fechaPlaneada?.getTime() ?? 0) - (b.fechaPlaneada?.getTime() ?? 0)
    );
    etapasPorVencer.sort(
      (a, b) => (a.fechaPlaneada?.getTime() ?? 0) - (b.fechaPlaneada?.getTime() ?? 0)
    );
    problemasAbiertos.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      etapasVencidas,
      etapasPorVencer,
      problemasAbiertos,
      lotesListos,
      recomendacionesUrgentes,
    };
  } catch (error) {
    console.error('obtenerSeguimientoDashboard: sin acceso a la base de datos', error);
    return vacio;
  }
}

export type { RecomendacionLote };
