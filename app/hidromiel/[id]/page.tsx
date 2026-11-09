import { notFound } from 'next/navigation';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenPrincipal } from '@/components/archivos';
import { BotonImprimir } from '@/components/boton-imprimir';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { generarQrDataUrl, urlFichaHidromiel } from '@/lib/qr';

export const dynamic = 'force-dynamic';

/**
 * Ficha pública de una hidromiel (sin login): nombre, descripción, foto
 * principal, estilo, ABV y lotes. No muestra costos ni datos internos.
 * Es la página a la que apunta el QR de las etiquetas.
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
      botellasReales: number;
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
            select: { codigoLote: true, estado: true, fechaProduccion: true, botellasReales: true },
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
  const ultimoLote = receta.lotesProduccion.find((l) => l.estado === 'COMPLETADO') ?? receta.lotesProduccion[0];
  const fechaLote = ultimoLote?.fechaProduccion
    ? new Date(ultimoLote.fechaProduccion).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6">
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@media print { body * { visibility: hidden !important; } #etiqueta, #etiqueta * { visibility: visible !important; } #etiqueta { position: absolute; inset: 0; margin: 0; border: none !important; box-shadow: none !important; } }',
        }}
      />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="imprimir-oculto text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">{receta.nombre}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {receta.estilo} · ABV {Number(receta.abv ?? 0).toFixed(1)}% · {receta.rendimientoBotellas} botellas por lote
          </p>
        </div>

        <div className="imprimir-oculto">
          <ImagenPrincipal entidad="RECETA" entidadId={receta.id} alt={`Foto de ${receta.nombre}`} />
        </div>

        {receta.descripcion && (
          <Card className="imprimir-oculto">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed text-slate-700">{receta.descripcion}</p>
            </CardContent>
          </Card>
        )}

        {receta.lotesProduccion.length > 0 && (
          <Card className="imprimir-oculto">
            <CardHeader>
              <CardTitle>Lotes</CardTitle>
              <CardDescription>Producción de esta hidromiel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {receta.lotesProduccion.slice(0, 5).map((lote) => (
                  <div key={lote.codigoLote} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                    <span className="font-medium">{lote.codigoLote}</span>
                    <span className="text-slate-500">
                      {lote.estado}
                      {lote.fechaProduccion
                        ? ` · ${new Date(lote.fechaProduccion).toLocaleDateString('es-MX')}`
                        : ''}
                      {lote.botellasReales > 0 ? ` · ${lote.botellasReales} bot.` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

        <div className="imprimir-oculto flex justify-center pb-8">
          <BotonImprimir />
        </div>
      </div>
    </main>
  );
}
