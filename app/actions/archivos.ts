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

/**
 * Estado que devuelven las acciones de archivos para useFormState.
 * Nunca lanzan por errores de validación, permisos, R2 o base de datos:
 * el error vuelve como { ok: false, error } y el formulario lo muestra
 * en pantalla, en lugar de romper la página con el error boundary (antes
 * el usuario veía "Algo salió mal" y el archivo nunca aparecía, como si
 * el botón no hiciera nada).
 */
export type EstadoArchivo = {
  ok: boolean;
  error?: string;
  exito?: string;
};

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
 * Solo imágenes (JPEG, PNG, WebP, GIF) y PDF, máximo 4 MB por archivo
 * (ver MAX_ARCHIVO_BYTES en lib/r2.ts: por encima de ~4.5 MB Vercel
 * rechaza la petición antes de que llegue a esta acción).
 */
export async function subirArchivo(
  _prevState: EstadoArchivo,
  formData: FormData
): Promise<EstadoArchivo> {
  try {
    await exigirPermiso('archivos');
    const entidad = validarEntidad(String(formData.get('entidad') ?? ''));
    const entidadId = String(formData.get('entidadId') ?? '').trim();
    const archivo = formData.get('archivo');

    if (!entidadId) {
      return { ok: false, error: 'Falta la entidad a la que pertenece el archivo' };
    }

    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, error: 'Selecciona un archivo para subir' };
    }

    if (archivo.size > MAX_ARCHIVO_BYTES) {
      return { ok: false, error: 'El archivo supera el máximo de 4 MB' };
    }

    const tipoMime = archivo.type;
    if (!Object.prototype.hasOwnProperty.call(TIPOS_PERMITIDOS, tipoMime)) {
      return {
        ok: false,
        error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF) y PDF',
      };
    }

    if (!isR2Configured()) {
      return { ok: false, error: 'Configura Cloudflare R2 en Vercel para subir archivos' };
    }

    if (!isDbConfigured()) {
      return { ok: false, error: 'Configura DATABASE_URL en Vercel para guardar archivos' };
    }

    const clave = generarClave(entidad, entidadId, archivo.name);
    const contenido = Buffer.from(await archivo.arrayBuffer());

    // Primero a R2; si falla, no queda ningún registro huérfano en la base.
    // El detalle técnico queda en el log del servidor; al usuario se le
    // muestra un mensaje claro (credenciales, bucket o red de R2).
    try {
      await subirArchivoAR2(clave, contenido, tipoMime);
    } catch (error) {
      console.error('subirArchivo: no se pudo subir a R2', error);
      return {
        ok: false,
        error:
          'No se pudo subir el archivo a Cloudflare R2. Revisa la configuración de R2 en Vercel (cuenta, bucket y token) e inténtalo de nuevo',
      };
    }

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
      return { ok: false, error: 'No se pudo guardar el archivo. Inténtalo de nuevo' };
    }

    for (const ruta of RUTAS_REVALIDAR[entidad]) {
      revalidatePath(ruta);
    }

    return { ok: true, exito: `«${archivo.name}» subido correctamente.` };
  } catch (error) {
    console.error('subirArchivo: error al subir', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo subir el archivo. Inténtalo de nuevo',
    };
  }
}

/**
 * Elimina un archivo: primero de Cloudflare R2 (mejor esfuerzo) y luego
 * su registro en la base de datos, para no dejar registros huérfanos.
 */
export async function eliminarArchivo(
  _prevState: EstadoArchivo,
  formData: FormData
): Promise<EstadoArchivo> {
  try {
    await exigirPermiso('archivos');
    const archivoId = String(formData.get('archivoId') ?? '').trim();
    const entidad = validarEntidad(String(formData.get('entidad') ?? ''));
    const entidadId = String(formData.get('entidadId') ?? '').trim();

    if (!archivoId) {
      return { ok: false, error: 'Falta el archivo a eliminar' };
    }

    if (!isDbConfigured()) {
      return { ok: false, error: 'Configura DATABASE_URL en Vercel para eliminar archivos' };
    }

    const registro = await prisma.archivo.findUnique({ where: { id: archivoId } });
    if (!registro) {
      return { ok: false, error: 'El archivo ya no existe' };
    }

    if (entidadId && registro.entidadId !== entidadId) {
      return { ok: false, error: 'El archivo no pertenece a esta entidad' };
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

    return { ok: true, exito: 'Archivo eliminado.' };
  } catch (error) {
    console.error('eliminarArchivo: error al eliminar', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar el archivo. Inténtalo de nuevo',
    };
  }
}
