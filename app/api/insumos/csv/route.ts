import { NextResponse } from 'next/server';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ENCABEZADOS = ['codigo', 'nombre', 'categoria', 'unidadMedida', 'costoUnitario', 'stockActual', 'stockMinimo', 'activo'];

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Descarga el inventario de insumos en CSV.
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
      const insumos = await prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
      for (const insumo of insumos) {
        filas.push([
          insumo.codigo,
          insumo.nombre,
          insumo.categoria,
          insumo.unidadMedida,
          Number(insumo.costoUnitario).toString(),
          Number(insumo.stockActual).toString(),
          Number(insumo.stockMinimo).toString(),
          insumo.activo ? 'si' : 'no',
        ]);
      }
    } catch (error) {
      console.error('GET /api/insumos/csv: sin acceso a la base de datos', error);
    }
  }

  const csv = filas.map((fila) => fila.map(escaparCsv).join(',')).join('\n');
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="melmir-inventario-${fecha}.csv"`,
    },
  });
}
