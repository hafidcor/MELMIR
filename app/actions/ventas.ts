'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
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
      include: {
        receta: true,
        clienteRel: true,
        productoTerminado: { include: { loteProduccion: true } },
        abonos: { orderBy: { fecha: 'desc' } },
      },
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
  margenTotal: number;
  margenMes: number;
  ventasSinCosto: number;
  porMes: Array<{ mes: string; etiqueta: string; botellas: number; ingresos: number }>;
};

/**
 * Resumen de ventas para el dashboard: totales históricos, ventas del mes
 * en curso, margen (precio de venta − costo por botella) y desglose por
 * mes (últimos 6 meses) para el gráfico de barras.
 * El margen solo se suma cuando el lote tiene costo registrado (costo
 * unitario mayor que 0); las ventas sin costo se cuentan aparte y no se
 * inventa un margen para ellas.
 */
export async function obtenerResumenVentas(): Promise<ResumenVentas> {
  const vacio: ResumenVentas = {
    botellasVendidas: 0,
    ingresosTotales: 0,
    ventasMes: 0,
    ingresosMes: 0,
    ventasCount: 0,
    margenTotal: 0,
    margenMes: 0,
    ventasSinCosto: 0,
    porMes: [],
  };

  if (!isDbConfigured()) {
    return vacio;
  }

  try {
    const ventas = await prisma.venta.findMany({
      orderBy: { fecha: 'asc' },
      select: {
        fecha: true,
        botellasVendidas: true,
        total: true,
        precioUnitario: true,
        productoTerminado: { select: { costoUnitarioBotella: true } },
      },
    });

    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

    let botellasVendidas = 0;
    let ingresosTotales = 0;
    let ventasMes = 0;
    let ingresosMes = 0;
    let margenTotal = 0;
    let margenMes = 0;
    let ventasSinCosto = 0;
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
      const costoUnitario = Number(venta.productoTerminado.costoUnitarioBotella);
      if (costoUnitario > 0) {
        const margen = (Number(venta.precioUnitario) - costoUnitario) * venta.botellasVendidas;
        margenTotal += margen;
        if (mes === mesActual) {
          margenMes += margen;
        }
      } else {
        ventasSinCosto += 1;
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
      margenTotal: Number(margenTotal.toFixed(2)),
      margenMes: Number(margenMes.toFixed(2)),
      ventasSinCosto,
      porMes,
    };
  } catch (error) {
    console.error('obtenerResumenVentas: sin acceso a la base de datos', error);
    return vacio;
  }
}

export type DatosVenta = {
  productoTerminadoId: string;
  botellasVendidas: number;
  precioUnitario?: number;
  clienteId?: string | null;
  clienteTexto?: string | null;
  estadoPago?: 'PAGADO' | 'PENDIENTE';
  montoPagado?: number;
  notas?: string | null;
};

/**
 * Núcleo de creación de una venta dentro de una transacción: valida
 * cantidad y precio, rechaza si no hay stock suficiente, crea la venta y
 * descuenta las botellas del lote. Lo usan registrarVenta (formulario),
 * el punto de venta y la conversión de pedidos.
 * Si el precio unitario viene vacío, se usa el precio sugerido de /precios.
 * Si el estado es PENDIENTE, el monto pagado es el abono inicial (0 por
 * defecto); si es PAGADO, el monto pagado es el total.
 */
export async function crearVentaEnTransaccion(
  tx: Prisma.TransactionClient,
  datos: DatosVenta
) {
  const {
    productoTerminadoId,
    botellasVendidas,
    precioUnitario,
    clienteId,
    clienteTexto,
    estadoPago = 'PAGADO',
    montoPagado = 0,
    notas,
  } = datos;

  if (!productoTerminadoId) {
    throw new Error('Selecciona un lote con stock disponible');
  }
  if (!Number.isInteger(botellasVendidas) || botellasVendidas <= 0) {
    throw new Error('Las botellas vendidas deben ser un número entero mayor que 0');
  }
  if (precioUnitario !== undefined && (!Number.isFinite(precioUnitario) || precioUnitario < 0)) {
    throw new Error('El precio unitario debe ser 0 o mayor');
  }

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

  const precioFinal =
    precioUnitario === undefined || Number.isNaN(precioUnitario)
      ? Number(
          calcularPrecioVenta({
            costoUnitario: Number(producto.costoUnitarioBotella),
            ieps: IEPS,
            iva: IVA,
            margen: MARGEN,
          }).precioFinal.toFixed(2)
        )
      : precioUnitario;

  const total = Number((botellasVendidas * precioFinal).toFixed(2));
  const pagado =
    estadoPago === 'PAGADO' ? total : Math.min(Math.max(montoPagado, 0), total);

  let nombreCliente: string | null = clienteTexto?.trim() ? clienteTexto.trim() : null;
  if (clienteId) {
    const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      throw new Error('El cliente seleccionado no existe');
    }
    nombreCliente = cliente.nombre;
  }

  const venta = await tx.venta.create({
    data: {
      productoTerminadoId: producto.id,
      recetaId: producto.recetaId,
      botellasVendidas,
      precioUnitario: precioFinal,
      total,
      cliente: nombreCliente,
      clienteId: clienteId || null,
      estadoPago,
      montoPagado: pagado,
      notas: notas?.trim() ? notas.trim() : null,
    },
  });

  await tx.productoTerminado.update({
    where: { id: producto.id },
    data: { botellasEnStock: producto.botellasEnStock - botellasVendidas },
  });

  return venta;
}

/**
 * Registra una venta de producto terminado desde el formulario de ventas.
 */
export async function registrarVenta(formData: FormData) {
  await exigirPermiso('ventas');
  const productoTerminadoId = String(formData.get('productoTerminadoId') ?? '').trim();
  const botellasVendidas = Number(formData.get('botellasVendidas') ?? 0);
  const precioUnitarioForm = String(formData.get('precioUnitario') ?? '').trim();
  const precioUnitario = precioUnitarioForm === '' ? undefined : Number(precioUnitarioForm);
  const clienteId = String(formData.get('clienteId') ?? '').trim() || null;
  const cliente = String(formData.get('cliente') ?? '').trim();
  const estadoPagoForm = String(formData.get('estadoPago') ?? 'PAGADO').trim();
  const estadoPago: 'PAGADO' | 'PENDIENTE' = estadoPagoForm === 'PENDIENTE' ? 'PENDIENTE' : 'PAGADO';
  const montoPagado = Number(formData.get('montoPagado') ?? 0);
  const notas = String(formData.get('notas') ?? '').trim();

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para registrar ventas');
  }

  await prisma.$transaction(async (tx) => {
    await crearVentaEnTransaccion(tx, {
      productoTerminadoId,
      botellasVendidas,
      precioUnitario,
      clienteId,
      clienteTexto: cliente || null,
      estadoPago,
      montoPagado: Number.isFinite(montoPagado) ? montoPagado : 0,
      notas: notas || null,
    });
  });

  revalidatePath('/ventas');
  revalidatePath('/dashboard');
  revalidatePath('/historial');
  revalidatePath('/precios');
  revalidatePath('/clientes');
  revalidatePath('/pedidos');
  revalidatePath('/pos');
  revalidatePath('/');
}
