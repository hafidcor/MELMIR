import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Cliente de Cloudflare R2 (API S3-compatible).
 *
 * Variables necesarias (ver .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * Sin ellas, isR2Configured() es false y la UI muestra un aviso en lugar
 * de romper: mismo patrón que DATABASE_URL / isDbConfigured().
 */

/**
 * Tamaño máximo por archivo: 4 MB. Vercel rechaza con error 413 los
 * cuerpos de petición mayores de ~4.5 MB en funciones serverless, así
 * que el límite de la app debe quedar por debajo de ese tope y el
 * formulario valida el tamaño antes de enviar (ver
 * components/formulario-archivo.tsx). next.config.mjs ya sube el límite
 * de las server actions a 5 MB; este tope de 4 MB es el que se anuncia.
 */
export const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024; // 4 MB

/** Prefijo de los respaldos de la base de datos dentro del bucket R2. */
export const PREFIJO_RESPALDOS = 'melmir/respaldos/';

export const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

export function isR2Configured(): boolean {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } =
    process.env;
  return [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME].every(
    (v) => typeof v === 'string' && v.trim().length > 0
  );
}

export function getR2Bucket(): string {
  return String(process.env.R2_BUCKET_NAME ?? '').trim();
}

/** URL pública base para servir los archivos (dominio r2.dev o dominio propio). */
export function getR2PublicUrl(): string {
  return String(process.env.R2_PUBLIC_URL ?? '').trim().replace(/\/$/, '');
}

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = String(process.env.R2_ACCOUNT_ID ?? '').trim();
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: String(process.env.R2_ACCESS_KEY_ID ?? ''),
        secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY ?? ''),
      },
    });
  }
  return r2Client;
}

function limpiarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

export function generarClave(
  entidad: string,
  entidadId: string,
  nombreOriginal: string
): string {
  const fecha = new Date().toISOString().slice(0, 10);
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `melmir/${entidad.toLowerCase()}/${entidadId}/${fecha}-${aleatorio}-${limpiarNombre(nombreOriginal)}`;
}

export function urlPublica(clave: string): string {
  const base = getR2PublicUrl();
  if (base) {
    return `${base}/${clave}`;
  }
  // Sin dominio público configurado, la URL es la del endpoint S3 de R2
  // (no sirve el archivo en público; el usuario debe configurar R2_PUBLIC_URL).
  const accountId = String(process.env.R2_ACCOUNT_ID ?? '').trim();
  const bucket = getR2Bucket();
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${clave}`;
}

export async function subirArchivoAR2(
  clave: string,
  contenido: Buffer,
  tipoMime: string
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: clave,
      Body: contenido,
      ContentType: tipoMime,
    })
  );
}

export async function eliminarArchivoDeR2(clave: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: clave })
  );
}

/**
 * Lista los objetos de R2 bajo un prefijo (p. ej. 'melmir/respaldos/').
 * Devuelve clave, tamaño en bytes y fecha de última modificación.
 * Ante cualquier error de R2, lanza el error para que lo gestione quien llama.
 */
export async function listarObjetosR2(
  prefijo: string
): Promise<Array<{ clave: string; tamano: number; fecha: Date | null }>> {
  const respuesta = await getR2Client().send(
    new ListObjectsV2Command({ Bucket: getR2Bucket(), Prefix: prefijo })
  );
  return (respuesta.Contents ?? [])
    .filter((objeto) => typeof objeto.Key === 'string' && objeto.Key.length > 0)
    .map((objeto) => ({
      clave: objeto.Key as string,
      tamano: objeto.Size ?? 0,
      fecha: objeto.LastModified ?? null,
    }));
}

/**
 * Obtiene un objeto de R2 y devuelve su Body tal cual (stream del SDK de
 * AWS), para que la ruta API que lo sirve lo devuelva como respuesta.
 */
export async function obtenerObjetoR2(clave: string) {
  const respuesta = await getR2Client().send(
    new GetObjectCommand({ Bucket: getR2Bucket(), Key: clave })
  );
  return respuesta.Body;
}
