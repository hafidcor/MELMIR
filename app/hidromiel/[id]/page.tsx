import { notFound } from 'next/navigation';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenPrincipal, obtenerArchivos } from '@/components/archivos';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { generarQrDataUrl, urlFichaHidromiel } from '@/lib/qr';

export const dynamic = 'force-dynamic';

/**
 * Ficha pública de una hidromiel (sin login), pensada para quien escanea
 * el QR de la etiqueta: solo información e imágenes del producto —
 * nombre, estilo, ABV, botellas por lote, historia/descripción, foto
 * principal, galería y la etiqueta con su QR. Sin datos internos de
 * producción, sin botones del dueño y sin enlaces hacia dentro de la app.
 */
export default async function FichaHidromielPage({ params }: { params: { id: string } }) {
  let receta: {
    id: string;
    nombre: string;
    estilo: string;
    descripcion: string | null;
    abv: unknown;
    rendimientoBotellas: number;
    lotesProduccion: Array<{
      codigoLote: string;
      estado: string;
      fechaProduccion: Date | null;
    }>;
  } | null = null;

  if (isDbConfigured()) {
    try {
      receta = await prisma.receta.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          nombre: true,
          estilo: true,
          descripcion: true,
          abv: true,
          rendimientoBotellas: true,
          lotesProduccion: {
            select: { codigoLote: true, estado: true, fechaProduccion: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      console.error('FichaHidromielPage: sin acceso a la base de datos', error);
    }
  }

  if (!receta) {
    notFound();
  }

  const urlPublica = urlFichaHidromiel(receta.id);
  const qr = await generarQrDataUrl(urlPublica);
  const ultimoLote =
    receta.lotesProduccion.find((l) => l.estado === 'COMPLETADO') ?? receta.lotesProduccion[0];
  const fechaLote = ultimoLote?.fechaProduccion
    ? new Date(ultimoLote.fechaProduccion).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Galería: todas las imágenes de la receta, de la más antigua a la más
  // reciente, para que la primera sea la foto principal.
  const archivos = await obtenerArchivos('RECETA', receta.id);
  const imagenes = archivos.filter((a) => a.tipoMime.startsWith('image/')).reverse();

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">{receta.nombre}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {receta.estilo} · ABV {Number(receta.abv ?? 0).toFixed(1)}% · {receta.rendimientoBotellas}{' '}
            botellas por lote
          </p>
        </div>

        <ImagenPrincipal entidad="RECETA" entidadId={receta.id} alt={`Foto de ${receta.nombre}`} />

        {receta.descripcion && (
          <Card>
            <CardHeader>
              <CardTitle>Historia</CardTitle>
              <CardDescription>Sobre esta hidromiel</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {receta.descripcion}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Galería</CardTitle>
            <CardDescription>Fotos de esta hidromiel · toca una imagen para verla completa</CardDescription>
          </CardHeader>
          <CardContent>
            {imagenes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aún no hay fotos de esta hidromiel.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagenes.map((imagen, i) => (
                  <Link
                    key={imagen.id}
                    href={imagen.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ver foto ${i + 1} de ${receta.nombre} completa`}
                  >
                    <Image
                      src={imagen.url}
                      alt={`${receta.nombre} — foto ${i + 1}`}
                      width={320}
                      height={320}
                      className="aspect-square h-auto w-full rounded-lg border border-slate-200 object-cover"
                      unoptimized
                    />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="etiqueta" className="mx-auto max-w-sm bg-white">
          <CardContent className="space-y-3 pt-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR · Hidromiel</p>
            <p className="text-2xl font-bold">{receta.nombre}</p>
            <p className="text-sm text-slate-500">
              {receta.estilo} · ABV {Number(receta.abv ?? 0).toFixed(1)}%
            </p>
            {ultimoLote && (
              <p className="text-sm text-slate-500">
                Lote {ultimoLote.codigoLote}
                {fechaLote ? ` · ${fechaLote}` : ''}
              </p>
            )}
            <div className="flex justify-center">
              <Image src={qr} alt={`Código QR de ${receta.nombre}`} width={192} height={192} unoptimized />
            </div>
            <p className="text-xs text-slate-400">Escanea para conocer esta hidromiel</p>
          </CardContent>
        </Card>

        <p className="pb-8 text-center text-xs text-slate-400">MELMIR · Hidromiel artesanal</p>
      </div>
    </main>
  );
}
