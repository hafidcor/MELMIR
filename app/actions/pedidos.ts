'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';
import { crearVentaEnTransaccion } from '@/app/actions/ventas';

/** Botellas comprometidas en pedidos pendientes, agrupadas por receta. */
export async function obtenerApartadasPorReceta(): Promise<Record<string, number>> {
  if (!isDbConfigured()) {
    return {};
  }
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'PENDIENTE' },
      select: { recetaId: true, cantidadBotellas: true },
    });
    const mapa: Record<string, number> = {};
    for (const pedido of pedidos) {
      mapa[pedido.recetaId] = (mapa[pedido.recetaId] ?? 0) + pedido.cantidadBotellas;
    }
    return mapa;
  } catch (error) {
    console.error('obtenerApartadasPorReceta: sin acceso a la base de datos', error);
    return {};
  }
}

export async function obtenerPedidos() {
  if (!isDbConfigured()) {
    return [];
  }
  try {
    return await prisma.pedido.findMany({
      orderBy: { fechaPedido: 'desc' },
      include: { receta: true, cliente: true },
      take: 100,
    });
  } catch (error) {
    console.error('obtenerPedidos: sin acceso a la base de datos', error);
    return [];
  }
}

export async function crearPedido(formData: FormData) {
  await exigirPermiso('pedidos');
  const recetaId = String(formData.get('recetaId') ?? '').trim();
  const clienteId = String(formData.get('clienteId') ?? '').trim() || null;
  const cantidadBotellas = Number(formData.get('cantidadBotellas') ?? 0);
  const fechaEntregaForm = String(formData.get('fechaEntrega') ?? '').trim();
  const notas = String(formData.get('notas') ?? '').trim();

  if (!recetaId) {
    throw new Error('Selecciona una hidromiel');
  }
  if (!Number.isInteger(cantidadBotellas) || cantidadBotellas <= 0) {
    throw new Error('La cantidad de botellas debe ser un número entero mayor que 0');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para crear pedidos');
  }

  const receta = await prisma.receta.findUnique({ where: { id: recetaId } });
  if (!receta) {
    throw new Error('La hidromiel seleccionada no existe');
  }
  if (clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      throw new Error('El cliente seleccionado no existe');
    }
  }

  await prisma.pedido.create({
    data: {
      recetaId,
      clienteId,
      cantidadBotellas,
      fechaEntrega: fechaEntregaForm ? new Date(fechaEntregaForm) : null,
      notas: notas || null,
    },
  });

  revalidatePath('/pedidos');
  revalidatePath('/ventas');
  revalidatePath('/pos');
  revalidatePath('/dashboard');
}

export async function cancelarPedido(formData: FormData) {
  await exigirPermiso('pedidos');
  const pedidoId = String(formData.get('pedidoId') ?? '').trim();
  if (!pedidoId) {
    throw new Error('Falta el pedido a cancelar');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para cancelar pedidos');
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    throw new Error('El pedido no existe');
  }
  if (pedido.estado !== 'PENDIENTE') {
    throw new Error('Solo se pueden cancelar pedidos pendientes');
  }

  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { estado: 'CANCELADO' },
  });

  revalidatePath('/pedidos');
  revalidatePath('/ventas');
  revalidatePath('/pos');
  revalidatePath('/dashboard');
}

/**
 * Convierte un pedido pendiente en venta: descuenta el stock con la
 * misma lógica de registrarVenta y marca el pedido como COMPLETADO,
 * todo en la misma transacción.
 */
export async function convertirPedidoAVenta(formData: FormData) {
  await exigirPermiso('ventas');
  const pedidoId = String(formData.get('pedidoId') ?? '').trim();
  const productoTerminadoId = String(formData.get('productoTerminadoId') ?? '').trim();
  const precioUnitarioForm = String(formData.get('precioUnitario') ?? '').trim();
  const precioUnitario = precioUnitarioForm === '' ? undefined : Number(precioUnitarioForm);
  const estadoPagoForm = String(formData.get('estadoPago') ?? 'PAGADO').trim();
  const estadoPago: 'PAGADO' | 'PENDIENTE' = estadoPagoForm === 'PENDIENTE' ? 'PENDIENTE' : 'PAGADO';
  const montoPagado = Number(formData.get('montoPagado') ?? 0);

  if (!pedidoId) {
    throw new Error('Falta el pedido a convertir');
  }
  if (!productoTerminadoId) {
    throw new Error('Selecciona el lote del que salen las botellas');
  }
  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para convertir pedidos');
  }

  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { receta: true, cliente: true },
    });
    if (!pedido) {
      throw new Error('El pedido no existe');
    }
    if (pedido.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden convertir pedidos pendientes');
    }

    const producto = await tx.productoTerminado.findUnique({
      where: { id: productoTerminadoId },
      include: { receta: true },
    });
    if (!producto || producto.recetaId !== pedido.recetaId) {
      throw new Error('El lote seleccionado no corresponde a la hidromiel del pedido');
    }

    await crearVentaEnTransaccion(tx, {
      productoTerminadoId: producto.id,
      botellasVendidas: pedido.cantidadBotellas,
      precioUnitario,
      clienteId: pedido.clienteId,
      clienteTexto: pedido.cliente ? pedido.cliente.nombre : null,
      estadoPago,
      montoPagado: Number.isFinite(montoPagado) ? montoPagado : 0,
      notas: `Pedido del ${pedido.fechaPedido.toLocaleDateString('es-MX')}${pedido.notas ? ` · ${pedido.notas}` : ''}`,
    });

    await tx.pedido.update({
      where: { id: pedido.id },
      data: { estado: 'COMPLETADO' },
    });
  });

  revalidatePath('/pedidos');
  revalidatePath('/ventas');
  revalidatePath('/dashboard');
  revalidatePath('/clientes');
  revalidatePath('/pos');
  revalidatePath('/');
}
