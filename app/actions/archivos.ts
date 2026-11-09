'use server';

import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { exigirPermiso } from '@/lib/auth';
import {
  MAX_ARCHIVO_BYTES,
  TIPOS_PERMITIDOS,
  eliminarArchivoDeR2,
  generarClave,
  isR2Configured,
  subirArchivoAR2,
  urlPublica,
} from '@/lib/r2';

const ENTIDADES_VALIDAS = ['RECETA', 'LOTE', 'INSUMO', 'VENTA'] as const;
type Entidad = (typeof ENTIDADES_VALIDAS)[number];

const RUTAS_REVALIDAR: Record<Entidad, string[]> = {
  RECETA: ['/recetas', '/'],
  LOTE: ['/produccion', '/historial', '/'],
  INSUMO: ['/insumos', '/'],
  VENTA: ['/ventas', '/dashboard', '/'],
};

function validarEntidad(valor: string): Entidad {
  const entidad = valor.trim().toUpperCase();
  if ((ENTIDADES_VALIDAS as readonly string[]).includes(entidad)) {
    return entidad as Entidad;
  }
  throw new Error('Entidad no válida para el archivo');
}

/**
 * Sube un archivo a Cloudflare R2 y registra sus metadatos en la base.
 * Solo imágenes (JPEG, PNG, WebP, GIF) y PDF, máximo 5 MB por archivo.
 */
export async function subirArchivo(formData: FormData) {
  await exigirPermiso('archivos');
  const entidad = validarEntidad(String(formData.get('entidad') ?? ''));
  const entidadId = String(formData.get('entidadId') ?? '').trim();
  const archivo = formData.get('archivo');

  if (!entidadId) {
    throw new Error('Falta la entidad a la que pertenece el archivo');
  }

  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error('Selecciona un archivo para subir');
  }

  if (archivo.size > MAX_ARCHIVO_BYTES) {
    throw new Error('El archivo supera el máximo de 5 MB');
  }

  const tipoMime = archivo.type;
  if (!Object.prototype.hasOwnProperty.call(TIPOS_PERMITIDOS, tipoMime)) {
    throw new Error(
      'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF) y PDF'
    );
  }

  if (!isR2Configured()) {
    throw new Error('Configura Cloudflare R2 en Vercel para subir archivos');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para guardar archivos');
  }

  const clave = generarClave(entidad, entidadId, archivo.name);
  const contenido = Buffer.from(await archivo.arrayBuffer());

  // Primero a R2; si falla, no queda ningún registro huérfano en la base.
  await subirArchivoAR2(clave, contenido, tipoMime);

  try {
    await prisma.archivo.create({
      data: {
        nombreOriginal: archivo.name,
        clave,
        url: urlPublica(clave),
        tipoMime,
        tamano: archivo.size,
        entidad,
        entidadId,
      },
    });
  } catch (error) {
    // El archivo ya está en R2 pero no se pudo registrar: se intenta
    // limpiarlo para no dejar basura, y se reporta el error original.
    console.error('subirArchivo: no se pudo registrar el archivo en la base', error);
    try {
      await eliminarArchivoDeR2(clave);
    } catch {
      // Se deja el objeto en R2; se puede limpiar por su clave.
    }
    throw new Error('No se pudo guardar el archivo. Inténtalo de nuevo');
  }

  for (const ruta of RUTAS_REVALIDAR[entidad]) {
    revalidatePath(ruta);
  }
}

/**
 * Elimina un archivo: primero de Cloudflare R2 (mejor esfuerzo) y luego
 * su registro en la base de datos, para no dejar registros huérfanos.
 */
export async function eliminarArchivo(formData: FormData) {
  await exigirPermiso('archivos');
  const archivoId = String(formData.get('archivoId') ?? '').trim();
  const entidad = validarEntidad(String(formData.get('entidad') ?? ''));
  const entidadId = String(formData.get('entidadId') ?? '').trim();

  if (!archivoId) {
    throw new Error('Falta el archivo a eliminar');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para eliminar archivos');
  }

  const registro = await prisma.archivo.findUnique({ where: { id: archivoId } });
  if (!registro) {
    throw new Error('El archivo ya no existe');
  }

  if (entidadId && registro.entidadId !== entidadId) {
    throw new Error('El archivo no pertenece a esta entidad');
  }

  if (isR2Configured()) {
    try {
      await eliminarArchivoDeR2(registro.clave);
    } catch (error) {
      console.error('eliminarArchivo: no se pudo borrar el objeto de R2', error);
      // Se continúa con el borrado del registro para no dejarlo huérfano.
    }
  }

  await prisma.archivo.delete({ where: { id: archivoId } });

  for (const ruta of RUTAS_REVALIDAR[entidad]) {
    revalidatePath(ruta);
  }
}
