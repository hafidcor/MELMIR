"use server";

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';

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
  revalidatePath('/');
}

export async function crearReceta(formData: FormData) {
  await exigirPermiso('recetas');
  const nombre = String(formData.get('nombre') ?? '').trim();
  const estilo = String(formData.get('estilo') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  const abv = Number(formData.get('abv') ?? 0);
  const volumenLoteEstimado = Number(formData.get('volumenLoteEstimado') ?? 0);
  const rendimientoBotellas = Number(formData.get('rendimientoBotellas') ?? 0);

  if (!nombre || !estilo || rendimientoBotellas <= 0) {
    throw new Error('Nombre, estilo y rendimiento son obligatorios');
  }

  if (descripcion.length > 2000) {
    throw new Error('La descripción no puede superar los 2000 caracteres');
  }

  await prisma.receta.create({
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
  revalidatePath('/');
}

export async function crearLote(formData: FormData) {
  await exigirPermiso('produccion');
  const recetaId = String(formData.get('recetaId') ?? '');
  const botellasEsperadas = Number(formData.get('botellasEsperadas') ?? 0);

  if (!recetaId || botellasEsperadas <= 0) {
    throw new Error('Selecciona una receta y establece el número de botellas');
  }

  const receta = await prisma.receta.findUnique({ where: { id: recetaId } });

  if (!receta) {
    throw new Error('La receta no existe');
  }

  const codigoLote = `LT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900 + 100))}`;

  const lote = await prisma.loteProduccion.create({
    data: {
      codigoLote,
      recetaId,
      botellasEsperadas: botellasEsperadas,
      estado: 'PENDIENTE',
      fechaPlanificada: new Date(),
      costoTotalLote: 0,
      costoUnitarioPieza: 0,
      etapas: {
        create: [
          { nombre: 'Fermentación', orden: 1 },
          { nombre: 'Trasiego', orden: 2 },
          { nombre: 'Clarificación', orden: 3 },
          { nombre: 'Embotellado', orden: 4 },
        ],
      },
    },
  });

  revalidatePath('/produccion');
  revalidatePath('/dashboard');
  revalidatePath('/');
}

export type ConsumoRealInsumo = {
  insumoId: string;
  cantidad: number;
};

export type CostoAdicional = {
  concepto: string;
  monto: number;
};

/**
 * Cierra un lote con su CONSUMO REAL de insumos, no con la fórmula
 * teórica de la receta: el costo es variable según la inversión de
 * cada lote (si gastó más miel o más agua, el costo refleja eso).
 *
 * - `consumoReal`: cantidad real consumida de cada insumo de la receta.
 *   Si no se indica un insumo, se usa su cantidad teórica.
 * - `costosAdicionales`: gastos de producción del lote (gas, mano de
 *   obra, flete, etc.) que se suman al costo total del lote.
 *
 * El costo total = Σ (cantidad real × costo unitario del insumo en ese
 * momento) + Σ costos adicionales. El costo por botella se divide entre
 * las botellas reales producidas. Cada consumo queda ligado al lote
 * (loteProduccionId) y el costo se guarda en el lote y en el producto
 * terminado, del que luego salen el margen de ventas y el precio del
 * punto de venta.
 */
export async function completarLoteProduccion({
  loteId,
  botellasReales,
  consumoReal = [],
  costosAdicionales = [],
}: {
  loteId: string;
  botellasReales: number;
  consumoReal?: ConsumoRealInsumo[];
  costosAdicionales?: CostoAdicional[];
}) {
  if (!loteId) {
    throw new Error('Debes indicar el lote a completar');
  }

  if (!Number.isFinite(botellasReales) || botellasReales <= 0) {
    throw new Error('Las botellas reales deben ser mayores que 0');
  }

  const consumoPorInsumo = new Map<string, number>();
  for (const item of consumoReal) {
    if (!item.insumoId) {
      continue;
    }
    if (!Number.isFinite(item.cantidad) || item.cantidad < 0) {
      throw new Error('Las cantidades consumidas deben ser 0 o mayores');
    }
    consumoPorInsumo.set(item.insumoId, item.cantidad);
  }

  const adicionalesLimpios: CostoAdicional[] = [];
  for (const adicional of costosAdicionales) {
    const concepto = adicional.concepto.trim();
    if (!concepto && !(adicional.monto > 0)) {
      continue;
    }
    if (!concepto) {
      throw new Error('Cada costo adicional necesita un concepto');
    }
    if (!Number.isFinite(adicional.monto) || adicional.monto < 0) {
      throw new Error(`El monto de "${concepto}" debe ser 0 o mayor`);
    }
    adicionalesLimpios.push({ concepto, monto: adicional.monto });
  }

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

    let costoInsumos = 0;

    for (const item of lote.receta.recetaInsumos) {
      const cantidadTeorica = Number(item.cantidadConsumida);
      const cantidadReal = consumoPorInsumo.has(item.insumoId)
        ? Number(consumoPorInsumo.get(item.insumoId))
        : cantidadTeorica;
      const insumo = item.insumo;
      const costoUnitario = Number(insumo.costoUnitario);
      const nuevoStock = Number(insumo.stockActual) - cantidadReal;

      if (nuevoStock < 0) {
        throw new Error(
          `Stock insuficiente de ${insumo.nombre}: se necesitan ${cantidadReal} ${insumo.unidadMedida} y hay ${Number(insumo.stockActual)}`
        );
      }

      costoInsumos += cantidadReal * costoUnitario;

      if (cantidadReal > 0) {
        await tx.insumo.update({
          where: { id: insumo.id },
          data: { stockActual: nuevoStock },
        });

        await tx.insumoMovimiento.create({
          data: {
            insumoId: insumo.id,
            tipo: 'PRODUCCION_CONSUMO',
            cantidad: cantidadReal,
            costoUnitario,
            total: cantidadReal * costoUnitario,
            saldoAfter: nuevoStock,
            referencia: `Lote ${lote.codigoLote}`,
            loteProduccionId: lote.id,
          },
        });
      }
    }

    const costoAdicionales = adicionalesLimpios.reduce((sum, a) => sum + a.monto, 0);
    const costoLote = costoInsumos + costoAdicionales;
    const costoPorPieza = costoLote / botellasReales;

    for (const adicional of adicionalesLimpios) {
      await tx.costoAdicionalLote.create({
        data: {
          loteProduccionId: lote.id,
          concepto: adicional.concepto,
          monto: adicional.monto,
        },
      });
    }

    const producto = await tx.productoTerminado.upsert({
      where: { loteProduccionId: lote.id },
      update: {
        botellasEnStock: botellasReales,
        costoRealLote: costoLote,
        costoUnitarioBotella: costoPorPieza,
      },
      create: {
        loteProduccionId: lote.id,
        recetaId: lote.recetaId,
        botellasEnStock: botellasReales,
        costoRealLote: costoLote,
        costoUnitarioBotella: costoPorPieza,
      },
    });

    await tx.loteProduccion.update({
      where: { id: lote.id },
      data: {
        estado: 'COMPLETADO',
        botellasReales,
        costoTotalLote: costoLote,
        costoUnitarioPieza: costoPorPieza,
        fechaProduccion: new Date(),
      },
    });

    return {
      loteId: lote.id,
      productoId: producto.id,
      costoLote,
      costoPorPieza,
      botellasReales,
    };
  });
}

/**
 * Acción de formulario: completa un lote desde la UI de producción.
 * Lee loteId y botellasReales del formulario y valida antes de cerrar.
 * Además lee el consumo real por insumo (campos consumo_<insumoId>) y
 * los costos adicionales (campos adicionalConcepto_<n> /
 * adicionalMonto_<n>). Los campos que vienen vacíos usan la cantidad
 * teórica de la receta.
 */
export async function completarLoteForm(formData: FormData) {
  await exigirPermiso('produccion');
  const loteId = String(formData.get('loteId') ?? '').trim();
  const botellasReales = Number(formData.get('botellasReales') ?? 0);

  if (!loteId) {
    throw new Error('Debes indicar el lote a completar');
  }

  if (!Number.isFinite(botellasReales) || botellasReales <= 0) {
    throw new Error('Las botellas reales deben ser mayores que 0');
  }

  const consumoReal: ConsumoRealInsumo[] = [];
  const entradasFormulario = Array.from(formData.entries());
  for (const [clave, valor] of entradasFormulario) {
    if (!clave.startsWith('consumo_')) {
      continue;
    }
    const insumoId = clave.slice('consumo_'.length);
    const texto = String(valor).trim();
    if (!insumoId || texto === '') {
      continue;
    }
    const cantidad = Number(texto);
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error('Las cantidades consumidas deben ser números 0 o mayores');
    }
    consumoReal.push({ insumoId, cantidad });
  }

  const costosAdicionales: CostoAdicional[] = [];
  for (const [clave, valor] of entradasFormulario) {
    if (!clave.startsWith('adicionalConcepto_')) {
      continue;
    }
    const indice = clave.slice('adicionalConcepto_'.length);
    const concepto = String(valor).trim();
    const montoTexto = String(formData.get(`adicionalMonto_${indice}`) ?? '').trim();
    const monto = montoTexto === '' ? 0 : Number(montoTexto);
    if (!concepto && monto <= 0) {
      continue;
    }
    if (!Number.isFinite(monto) || monto < 0) {
      throw new Error('Los montos adicionales deben ser números 0 o mayores');
    }
    costosAdicionales.push({ concepto, monto });
  }

  await completarLoteProduccion({ loteId, botellasReales, consumoReal, costosAdicionales });

  revalidatePath('/produccion');
  revalidatePath('/historial');
  revalidatePath('/precios');
  revalidatePath('/');
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
