import QRCode from 'qrcode';

/**
 * URL base pública de la app: sirve para construir los enlaces de las
 * fichas públicas de hidromiel (/hidromiel/[id]) que van en los QR.
 * En Vercel se usa el dominio de producción; en local, localhost.
 */
export function obtenerBaseUrl(): string {
  const publica = process.env.NEXT_PUBLIC_APP_URL;
  if (typeof publica === 'string' && publica.trim().length > 0) {
    return publica.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL;
  if (typeof vercel === 'string' && vercel.trim().length > 0) {
    return `https://${vercel.replace(/\/$/, '')}`;
  }
  return 'https://melmir.vercel.app';
}

export function urlFichaHidromiel(recetaId: string): string {
  return `${obtenerBaseUrl()}/hidromiel/${recetaId}`;
}

/**
 * Genera un QR (PNG en data URL) para una URL. Se usa en el servidor:
 * en el detalle de receta/lote y en la vista de etiqueta imprimible.
 */
export async function generarQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: { dark: '#065f46', light: '#ffffff' },
  });
}
