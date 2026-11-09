'use server';

import { revalidatePath } from 'next/cache';
import { exigirPermiso } from '@/lib/auth';
import { isDbConfigured, prisma } from '@/lib/prisma';
import {
  PREFIJO_RESPALDOS,
  eliminarArchivoDeR2,
  isR2Configured,
  listarObjetosR2,
  subirArchivoAR2,
} from '@/lib/r2';

export type RespaldoObjeto = {
  clave: string;
  tamano: number;
  fecha: Date | null;
};

function marcaFechaLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `-${pad(fecha.getHours())}${pad(fecha.getMinutes())}`
  );
}

/**
 * Crea un respaldo completo de la base de datos y lo guarda como JSON en
 * Cloudflare R2. Solo ADMIN (permiso 'respaldos').
 *
 * Incluye todas las tablas del ERP. De los usuarios solo se guardan id,
 * nombre, email, rol, activo y createdAt: NUNCA se incluye contrasenaHash
 * ni ningún dato de credenciales.
 */
export async function crearRespaldo() {
  await exigirPermiso('respaldos');

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para crear respaldos');
  }

  if (!isR2Configured()) {
    throw new Error('Configura Cloudflare R2 en Vercel para guardar respaldos');
  }

  const [
    insumos,
    recetas,
    recetaInsumos,
    movimientos,
    lotes,
    productosTerminados,
    ventas,
    archivos,
    usuarios,
  ] = await Promise.all([
    prisma.insumo.findMany(),
    prisma.receta.findMany(),
    prisma.recetaInsumo.findMany(),
    prisma.insumoMovimiento.findMany(),
    prisma.loteProduccion.findMany(),
    prisma.productoTerminado.findMany(),
    prisma.venta.findMany(),
    prisma.archivo.findMany(),
    prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    }),
  ]);

  const respaldo = {
    app: 'MELMIR',
    version: 1,
    fecha: new Date().toISOString(),
    tablas: {
      insumos,
      recetas,
      recetaInsumos,
      movimientos,
      lotes,
      productosTerminados,
      ventas,
      archivos,
      usuarios,
    },
  };

  const clave = `${PREFIJO_RESPALDOS}${marcaFechaLocal(new Date())}-respaldo.json`;
  const json = JSON.stringify(respaldo, null, 2);

  await subirArchivoAR2(clave, Buffer.from(json, 'utf-8'), 'application/json');

  revalidatePath('/respaldo');
}

/**
 * Lista los respaldos guardados en R2, del más reciente al más antiguo.
 * Es solo lectura de la página (que ya verifica el rol ADMIN), por eso no
 * exige el permiso aquí. Sin R2 configurado devuelve una lista vacía.
 */
export async function listarRespaldos(): Promise<RespaldoObjeto[]> {
  if (!isR2Configured()) {
    return [];
  }

  const objetos = await listarObjetosR2(PREFIJO_RESPALDOS);
  return objetos.sort((a, b) => {
    const fechaA = a.fecha ? a.fecha.getTime() : 0;
    const fechaB = b.fecha ? b.fecha.getTime() : 0;
    return fechaB - fechaA;
  });
}

/**
 * Elimina un respaldo de Cloudflare R2. Solo ADMIN (permiso 'respaldos').
 * La clave debe estar bajo 'melmir/respaldos/' y no puede contener '..'.
 */
export async function eliminarRespaldo(formData: FormData) {
  await exigirPermiso('respaldos');

  const clave = String(formData.get('clave') ?? '').trim();

  if (!clave.startsWith(PREFIJO_RESPALDOS) || clave.includes('..')) {
    throw new Error('Clave de respaldo no válida');
  }

  await eliminarArchivoDeR2(clave);

  revalidatePath('/respaldo');
}
