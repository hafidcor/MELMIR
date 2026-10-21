"use server";

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { calculateRecipeCost } from '@/app/lib/costeo';

export async function crearInsumo(formData: FormData) {
  const codigo = String(formData.get('codigo') ?? '');
  const nombre = String(formData.get('nombre') ?? '');
  const categoria = String(formData.get('categoria') ?? '');
  const unidadMedida = String(formData.get('unidadMedida') ?? 'KG');
  const costoUnitario = Number(formData.get('costoUnitario') ?? 0);
  const stockActual = Number(formData.get('stockActual') ?? 0);
  const stockMinimo = Number(formData.get('stockMinimo') ?? 0);

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

  revalidatePath('/insumos');
}

export async function crearReceta(formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '');
  const estilo = String(formData.get('estilo') ?? '');
  const abv = Number(formData.get('abv') ?? 0);
  const volumenLoteEstimado = Number(formData.get('volumenLoteEstimado') ?? 0);
  const rendimientoBotellas = Number(formData.get('rendimientoBotellas') ?? 0);

  await prisma.receta.create({
    data: {
      nombre,
      estilo,
      abv,
      volumenLoteEstimado,
      rendimientoBotellas,
      recetaInsumos: {
        create: [],
      },
    },
  });

  revalidatePath('/recetas');
}

export async function completarLoteProduccion({
  loteId,
  botellasReales,
}: {
  loteId: string;
  botellasReales: number;
}) {
  return prisma.$transaction(async (tx) => {
    const lote = await tx.loteProduccion.findUnique({
      where: { id: loteId },
      include: {
        receta: {
          include: {
            recetaInsumos: {
              include: {
                insumo: true,
              },
            },
          },
        },
      },
    });

    if (!lote) {
      throw new Error('Lote no encontrado');
    }

    if (lote.estado === 'COMPLETADO') {
      throw new Error('El lote ya está completado');
    }

    const costo = await calculateRecipeCost(lote.recetaId);

    for (const item of lote.receta.recetaInsumos) {
      const cantidadConsumida = Number(item.cantidadConsumida);
      const insumo = item.insumo;
      const nuevoStock = Number(insumo.stockActual) - cantidadConsumida;

      await tx.insumo.update({
        where: { id: insumo.id },
        data: { stockActual: nuevoStock },
      });

      await tx.insumoMovimiento.create({
        data: {
          insumoId: insumo.id,
          tipo: 'PRODUCCION_CONSUMO',
          cantidad: cantidadConsumida,
          costoUnitario: Number(insumo.costoUnitario),
          total: cantidadConsumida * Number(insumo.costoUnitario),
          saldoAfter: nuevoStock,
          referencia: `Lote ${lote.codigoLote}`,
        },
      });
    }

    const producto = await tx.productoTerminado.upsert({
      where: { loteProduccionId: lote.id },
      update: {
        botellasEnStock: botellasReales,
        costoRealLote: costo.costoLote,
        costoUnitarioBotella: costo.costoPorPieza,
      },
      create: {
        loteProduccionId: lote.id,
        recetaId: lote.recetaId,
        botellasEnStock: botellasReales,
        costoRealLote: costo.costoLote,
        costoUnitarioBotella: costo.costoPorPieza,
      },
    });

    await tx.loteProduccion.update({
      where: { id: lote.id },
      data: {
        estado: 'COMPLETADO',
        botellasReales,
        costoTotalLote: costo.costoLote,
        costoUnitarioPieza: costo.costoPorPieza,
        fechaProduccion: new Date(),
      },
    });

    return {
      loteId: lote.id,
      productoId: producto.id,
      costoLote: costo.costoLote,
      costoPorPieza: costo.costoPorPieza,
      botellasReales,
    };
  });
}

export async function obtenerPrecioVenta({
  costoUnitario,
  ieps = 0.08,
  iva = 0.16,
  margen = 0.3,
}: {
  costoUnitario: number;
  ieps?: number;
  iva?: number;
  margen?: number;
}) {
  const costoBase = costoUnitario;
  const impuestoIEPS = costoBase * ieps;
  const costoConIEPS = costoBase + impuestoIEPS;
  const impuestoIVA = costoConIEPS * iva;
  const costoConImpuestos = costoConIEPS + impuestoIVA;
  const margenAplicado = costoConImpuestos * margen;
  const precioFinal = costoConImpuestos + margenAplicado;

  return {
    costoBase,
    impuestoIEPS,
    impuestoIVA,
    costoConImpuestos,
    margenAplicado,
    precioFinal,
  };
}
