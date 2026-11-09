import { isR2Configured } from '@/lib/r2';

/**
 * Aviso visible cuando Cloudflare R2 no está configurado.
 * Se muestra en las secciones de archivos; no lanza errores.
 */
export function R2Warning() {
  if (isR2Configured()) {
    return null;
  }

  return (
    <div className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900">
      <p className="font-semibold">Archivos en Cloudflare R2 no configurados</p>
      <p className="mt-1">
        Configura Cloudflare R2 en Vercel (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME y R2_PUBLIC_URL) para subir fotos
        y documentos. Mientras tanto, la subida de archivos está desactivada y
        el resto de la aplicación sigue funcionando.
      </p>
    </div>
  );
}
