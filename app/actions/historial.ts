import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function registrarMovimientoInsumo(formData: FormData) {
  const insumoId = String(formData.get('insumoId') ?? '');
  const tipo = String(formData.get('tipo') ?? 'COMPRA');
  const cantidad = Number(formData.get('cantidad') ?? 0);
  const costoUnitario = Number(formData.get('costoUnitario') ?? 0);
  const referencia = String(formData.get('referencia') ?? '');

  if (!insumoId || cantidad <= 0) {
    throw new Error('Debes seleccionar un insumo y una cantidad válida');
  }

  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });

  if (!insumo) {
    throw new Error('El insumo no existe');
  }

  const stockActual = Number(insumo.stockActual);
  let nuevoStock = stockActual;

  if (tipo === 'COMPRA' || tipo === 'AJUSTE_ENTRADA') {
    nuevoStock = stockActual + cantidad;
  } else if (tipo === 'PRODUCCION_CONSUMO' || tipo === 'AJUSTE_SALIDA' || tipo === 'MERMA') {
    nuevoStock = stockActual - cantidad;
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
