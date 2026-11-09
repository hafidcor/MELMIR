'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';

export type ClienteConSaldo = {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  saldoPendiente: number;
  ventasPendientes: Array<{
    id: string;
    fecha: Date;
    recetaNombre: string;
    codigoLote: string;
    botellasVendidas: number;
    total: number;
    montoPagado: number;
    saldo: number;
  }>;
};

export type VentaPendienteResumen = {
  id: string;
  fecha: Date;
  recetaNombre: string;
  codigoLote: string;
  total: number;
  montoPagado: number;
  saldo: number;
};

/** Lista simple de clientes activos para los selects de ventas y pedidos. */
export async function obtenerClientes(): Promise<Array<{ id: string; nombre: string; telefono: string | null }>> {
  if (!isDbConfigured()) {
    return [];
  }
  try {
    return await prisma.cliente.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, telefono: true },
      orderBy: { nombre: 'asc' },
    });
  } catch (error) {
    console.error('obtenerClientes: sin acceso a la base de datos', error);
    return [];
  }
}

/**
 * Clientes con su saldo pendiente: suma de (total − montoPagado) de sus
 * ventas en estado PENDIENTE. Las ventas viejas quedaron como PAGADO,
 * así que no aportan saldo.
 */
export async function obtenerClientesConSaldo(): Promise<ClienteConSaldo[]> {
  if (!isDbConfigured()) {
    return [];
  }
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        ventas: {
          include: { receta: true, productoTerminado: { include: { loteProduccion: true } } },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    return clientes.map((cliente) => {
      const ventasPendientes = cliente.ventas
        .filter((v) => v.estadoPago === 'PENDIENTE')
        .map((v) => {
          const total = Number(v.total);
          const montoPagado = Number(v.montoPagado);
          return {
            id: v.id,
            fecha: v.fecha,
            recetaNombre: v.receta.nombre,
            codigoLote: v.productoTerminado.loteProduccion.codigoLote,
            botellasVendidas: v.botellasVendidas,
            total,
            montoPagado,
            saldo: Number((total - montoPagado).toFixed(2)),
          };
        })
        .filter((v) => v.saldo > 0);
      return {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        notas: cliente.notas,
        activo: cliente.activo,
        saldoPendiente: Number(ventasPendientes.reduce((s, v) => s + v.saldo, 0).toFixed(2)),
        ventasPendientes,
      };
    });
  } catch (error) {
    console.error('obtenerClientesConSaldo: sin acceso a la base de datos', error);
    return [];
  }
}

export async function crearCliente(formData: FormData) {
  await exigirPermiso('clientes');
  const nombre = String(formData.get('nombre') ?? '').trim();
  const telefono = String(formData.get('telefono') ?? '').trim();
  const notas = String(formData.get('notas') ?? '').trim();

  if (!nombre) {
    throw new Error('El nombre del cliente es obligatorio');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para crear clientes');
  }

  await prisma.cliente.create({
    data: { nombre, telefono: telefono || null, notas: notas || null },
  });

  revalidatePath('/clientes');
  revalidatePath('/ventas');
  revalidatePath('/pedidos');
  revalidatePath('/pos');
}

/**
 * Registra un abono a una venta pendiente: suma el monto a montoPagado y,
 * si el saldo llega a 0, la venta pasa a PAGADO. El monto no puede
 * superar el saldo pendiente.
 */
export async function registrarAbono(formData: FormData) {
  await exigirPermiso('clientes');
  const ventaId = String(formData.get('ventaId') ?? '').trim();
  const monto = Number(formData.get('monto') ?? 0);
  const notas = String(formData.get('notas') ?? '').trim();

  if (!ventaId) {
    throw new Error('Selecciona una venta pendiente');
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El abono debe ser mayor que 0');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para registrar abonos');
  }

  await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({ where: { id: ventaId } });
    if (!venta) {
      throw new Error('La venta no existe');
    }
    if (venta.estadoPago !== 'PENDIENTE') {
      throw new Error('Esa venta ya está pagada');
    }
    const saldo = Number(venta.total) - Number(venta.montoPagado);
    if (monto > saldo) {
      throw new Error(`El abono no puede ser mayor al saldo pendiente ($${saldo.toFixed(2)})`);
    }

    const nuevoPagado = Number((Number(venta.montoPagado) + monto).toFixed(2));
    await tx.abono.create({
      data: { ventaId: venta.id, monto, notas: notas || null },
    });
    await tx.venta.update({
      where: { id: venta.id },
      data: {
        montoPagado: nuevoPagado,
        estadoPago: nuevoPagado >= Number(venta.total) ? 'PAGADO' : 'PENDIENTE',
      },
    });
  });

  revalidatePath('/clientes');
  revalidatePath('/ventas');
  revalidatePath('/dashboard');
}
