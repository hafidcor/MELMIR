'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';
import { calcularPrecioVenta } from '@/app/lib/precios';

const IEPS = 0.08;
const IVA = 0.16;
const MARGEN = 0.3;

export type ProductoParaVenta = {
  id: string;
  botellasEnStock: number;
  costoUnitarioBotella: unknown;
  precioSugerido: number;
  receta: { id: string; nombre: string };
  loteProduccion: { codigoLote: string };
};

/**
 * Productos terminados con stock disponible, con su precio sugerido
 * (mismo cálculo que /precios: costo + IEPS 8% + IVA 16% + margen 30%).
 * Sin base de datos devuelve una lista vacía.
 */
export async function obtenerProductosParaVenta(): Promise<ProductoParaVenta[]> {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    const productos = await prisma.productoTerminado.findMany({
      where: { botellasEnStock: { gt: 0 } },
      include: { receta: true, loteProduccion: true },
      orderBy: { createdAt: 'desc' },
    });

    return productos.map((producto) => {
      const costoUnitario = Number(producto.costoUnitarioBotella);
      const precio = calcularPrecioVenta({
        costoUnitario,
        ieps: IEPS,
        iva: IVA,
        margen: MARGEN,
      });
      return {
        id: producto.id,
        botellasEnStock: producto.botellasEnStock,
        costoUnitarioBotella: producto.costoUnitarioBotella,
        precioSugerido: Number(precio.precioFinal.toFixed(2)),
        receta: { id: producto.receta.id, nombre: producto.receta.nombre },
        loteProduccion: { codigoLote: producto.loteProduccion.codigoLote },
      };
    });
  } catch (error) {
    console.error('obtenerProductosParaVenta: sin acceso a la base de datos', error);
    return [];
  }
}

export async function obtenerVentas() {
  if (!isDbConfigured()) {
    return [];
  }

  try {
    return await prisma.venta.findMany({
      orderBy: { fecha: 'desc' },
      include: { receta: true, productoTerminado: { include: { loteProduccion: true } } },
      take: 100,
    });
  } catch (error) {
    console.error('obtenerVentas: sin acceso a la base de datos', error);
    return [];
  }
}

export type ResumenVentas = {
  botellasVendidas: number;
  ingresosTotales: number;
  ventasMes: number;
  ingresosMes: number;
  ventasCount: number;
  porMes: Array<{ mes: string; etiqueta: string; botellas: number; ingresos: number }>;
};

/**
 * Resumen de ventas para el dashboard: totales históricos, ventas del mes
 * en curso y desglose por mes (últimos 6 meses) para el gráfico de barras.
 */
export async function obtenerResumenVentas(): Promise<ResumenVentas> {
  const vacio: ResumenVentas = {
    botellasVendidas: 0,
    ingresosTotales: 0,
    ventasMes: 0,
    ingresosMes: 0,
    ventasCount: 0,
    porMes: [],
  };

  if (!isDbConfigured()) {
    return vacio;
  }

  try {
    const ventas = await prisma.venta.findMany({
      orderBy: { fecha: 'asc' },
      select: { fecha: true, botellasVendidas: true, total: true },
    });

    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

    let botellasVendidas = 0;
    let ingresosTotales = 0;
    let ventasMes = 0;
    let ingresosMes = 0;
    const porMesMap = new Map<string, { botellas: number; ingresos: number }>();

    for (const venta of ventas) {
      const total = Number(venta.total);
      const mes = venta.fecha.toISOString().slice(0, 7);
      botellasVendidas += venta.botellasVendidas;
      ingresosTotales += total;
      if (mes === mesActual) {
        ventasMes += venta.botellasVendidas;
        ingresosMes += total;
      }
      const acumulado = porMesMap.get(mes) ?? { botellas: 0, ingresos: 0 };
      acumulado.botellas += venta.botellasVendidas;
      acumulado.ingresos += total;
      porMesMap.set(mes, acumulado);
    }

    // Últimos 6 meses, incluido el actual, en orden cronológico.
    const meses: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      meses.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`);
    }

    const porMes = meses.map((mes) => {
      const [anio, mesNum] = mes.split('-').map(Number);
      const etiqueta = new Date(anio, mesNum - 1, 1).toLocaleDateString('es-MX', {
        month: 'short',
      });
      const datos = porMesMap.get(mes) ?? { botellas: 0, ingresos: 0 };
      return { mes, etiqueta, botellas: datos.botellas, ingresos: Number(datos.ingresos.toFixed(2)) };
    });

    return {
      botellasVendidas,
      ingresosTotales: Number(ingresosTotales.toFixed(2)),
      ventasMes,
      ingresosMes: Number(ingresosMes.toFixed(2)),
      ventasCount: ventas.length,
      porMes,
    };
  } catch (error) {
    console.error('obtenerResumenVentas: sin acceso a la base de datos', error);
    return vacio;
  }
}

/**
 * Registra una venta de producto terminado: valida cantidad y precio,
 * rechaza la venta si no hay stock suficiente y descuenta las botellas
 * del lote en la misma transacción.
 * Si el precio unitario viene vacío, se usa el precio sugerido de /precios.
 */
export async function registrarVenta(formData: FormData) {
  await exigirPermiso('ventas');
  const productoTerminadoId = String(formData.get('productoTerminadoId') ?? '').trim();
  const botellasVendidas = Number(formData.get('botellasVendidas') ?? 0);
  const precioUnitarioForm = String(formData.get('precioUnitario') ?? '').trim();
  const precioUnitario = precioUnitarioForm === '' ? NaN : Number(precioUnitarioForm);
  const cliente = String(formData.get('cliente') ?? '').trim();
  const notas = String(formData.get('notas') ?? '').trim();

  if (!productoTerminadoId) {
    throw new Error('Selecciona un lote con stock disponible');
  }

  if (!Number.isInteger(botellasVendidas) || botellasVendidas <= 0) {
    throw new Error('Las botellas vendidas deben ser un número entero mayor que 0');
  }

  if (precioUnitarioForm !== '' && (!Number.isFinite(precioUnitario) || precioUnitario < 0)) {
    throw new Error('El precio unitario debe ser 0 o mayor');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para registrar ventas');
  }

  await prisma.$transaction(async (tx) => {
    const producto = await tx.productoTerminado.findUnique({
      where: { id: productoTerminadoId },
      include: { receta: true, loteProduccion: true },
    });

    if (!producto) {
      throw new Error('El lote seleccionado no existe');
    }

    if (producto.botellasEnStock < botellasVendidas) {
      throw new Error(
        `Stock insuficiente del lote ${producto.loteProduccion.codigoLote}: quedan ${producto.botellasEnStock} botellas`
      );
    }

    const precioFinal = Number.isNaN(precioUnitario)
      ? Number(
          calcularPrecioVenta({
            costoUnitario: Number(producto.costoUnitarioBotella),
            ieps: IEPS,
            iva: IVA,
            margen: MARGEN,
          }).precioFinal.toFixed(2)
        )
      : precioUnitario;

    await tx.venta.create({
      data: {
        productoTerminadoId: producto.id,
        recetaId: producto.recetaId,
        botellasVendidas,
        precioUnitario: precioFinal,
        total: Number((botellasVendidas * precioFinal).toFixed(2)),
        cliente: cliente || null,
        notas: notas || null,
      },
    });

    await tx.productoTerminado.update({
      where: { id: producto.id },
      data: { botellasEnStock: producto.botellasEnStock - botellasVendidas },
    });
  });

  revalidatePath('/ventas');
  revalidatePath('/dashboard');
  revalidatePath('/historial');
  revalidatePath('/precios');
  revalidatePath('/');
}
