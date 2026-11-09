import { NextResponse } from 'next/server';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ENCABEZADOS = ['fecha', 'insumo', 'codigo', 'tipo', 'cantidad', 'unidadMedida', 'costoUnitario', 'total', 'saldoAfter', 'referencia'];

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Descarga los movimientos de insumos en CSV (últimos 500).
 * Sin base de datos devuelve solo los encabezados, nunca un error 500.
 */
export async function GET() {
  try {
    await exigirSesion();
  } catch {
    return new NextResponse('Inicia sesión para continuar', { status: 401 });
  }

  const filas: string[][] = [ENCABEZADOS];

  if (isDbConfigured()) {
    try {
      const movimientos = await prisma.insumoMovimiento.findMany({
        orderBy: { createdAt: 'desc' },
        include: { insumo: true },
        take: 500,
      });
      for (const movimiento of movimientos) {
        filas.push([
          movimiento.createdAt.toISOString(),
          movimiento.insumo?.nombre ?? '',
          movimiento.insumo?.codigo ?? '',
          movimiento.tipo,
          Number(movimiento.cantidad).toString(),
          movimiento.insumo?.unidadMedida ?? '',
          movimiento.costoUnitario !== null && movimiento.costoUnitario !== undefined
            ? Number(movimiento.costoUnitario).toString()
            : '',
          movimiento.total !== null && movimiento.total !== undefined
            ? Number(movimiento.total).toString()
            : '',
          movimiento.saldoAfter !== null && movimiento.saldoAfter !== undefined
            ? Number(movimiento.saldoAfter).toString()
            : '',
          movimiento.referencia ?? '',
        ]);
      }
    } catch (error) {
      console.error('GET /api/historial/csv: sin acceso a la base de datos', error);
    }
  }

  const csv = filas.map((fila) => fila.map(escaparCsv).join(',')).join('\n');
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="melmir-movimientos-${fecha}.csv"`,
    },
  });
}
