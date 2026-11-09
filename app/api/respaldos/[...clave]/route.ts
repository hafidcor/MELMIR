import { NextResponse } from 'next/server';
import { hayUsuarios, obtenerSesion } from '@/lib/auth';
import { isR2Configured, obtenerObjetoR2 } from '@/lib/r2';

const PREFIJO_RESPALDOS = 'melmir/respaldos/';

/**
 * Descarga un respaldo JSON guardado en Cloudflare R2.
 * URL: /api/respaldos/melmir/respaldos/<archivo>.json
 *
 * Solo ADMIN. En modo abierto (sin usuarios creados) se permite la descarga.
 * La clave debe estar bajo 'melmir/respaldos/' y no puede contener '..',
 * para que no se pueda descargar ningún otro objeto del bucket.
 */
export async function GET(
  _request: Request,
  { params }: { params: { clave: string[] } }
) {
  const clave = params.clave.join('/');

  if (!clave.startsWith(PREFIJO_RESPALDOS) || clave.includes('..')) {
    return NextResponse.json({ error: 'Clave de respaldo no válida' }, { status: 400 });
  }

  if (await hayUsuarios()) {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (sesion.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permiso para descargar respaldos' }, { status: 403 });
    }
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'Cloudflare R2 no está configurado' },
      { status: 503 }
    );
  }

  try {
    const cuerpo = await obtenerObjetoR2(clave);
    if (!cuerpo) {
      return NextResponse.json({ error: 'Respaldo no encontrado' }, { status: 404 });
    }

    const nombreArchivo = clave.split('/').pop() ?? 'respaldo.json';
    return new Response(cuerpo as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (error) {
    const nombre = (error as { name?: string })?.name;
    const codigo = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    if (nombre === 'NoSuchKey' || codigo === 404) {
      return NextResponse.json({ error: 'Respaldo no encontrado' }, { status: 404 });
    }
    console.error('GET /api/respaldos: no se pudo obtener el respaldo', error);
    return NextResponse.json(
      { error: 'No se pudo descargar el respaldo' },
      { status: 500 }
    );
  }
}
