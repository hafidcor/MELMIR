import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Nombres de cookie duplicados aquí a propósito: el middleware es Edge y
// NO puede importar '@/lib/auth' (ese módulo importa Prisma y bcryptjs).
const COOKIE_SESION = 'melmir-sesion';
const COOKIE_ABIERTO = 'melmir-auth';

/**
 * Middleware Edge: no importa Prisma ni nada de Node.
 * - JWT de sesión válido → deja pasar.
 * - Cookie melmir-auth = 'off' (modo abierto, sin usuarios) → deja pasar.
 * - En cualquier otro caso → redirect a /login?next=<pathname>.
 * Si falta MELMIR_AUTH_SECRET, el JWT se trata como inválido.
 */
export async function middleware(request: NextRequest) {
  // Ficha pública de hidromiel (/hidromiel/[id]): sin login. Se marca
  // con un header para que el layout no muestre el menú del ERP.
  if (request.nextUrl.pathname.startsWith('/hidromiel')) {
    const respuesta = NextResponse.next();
    respuesta.headers.set('x-melmir-public', '1');
    return respuesta;
  }

  const sesion = request.cookies.get(COOKIE_SESION)?.value;
  const secreto = process.env.MELMIR_AUTH_SECRET;

  if (sesion && typeof secreto === 'string' && secreto.trim().length > 0) {
    try {
      await jwtVerify(sesion, new TextEncoder().encode(secreto), { algorithms: ['HS256'] });
      return NextResponse.next();
    } catch {
      // Token inválido o expirado: se sigue al resto de comprobaciones.
    }
  }

  if (request.cookies.get(COOKIE_ABIERTO)?.value === 'off') {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // La ficha pública /hidromiel queda dentro del matcher a propósito:
  // el middleware la deja pasar y marca el header x-melmir-public para
  // que el layout no muestre el menú. El manifiesto PWA y sus iconos
  // quedan fuera para que el navegador los pueda leer sin sesión.
  matcher: ['/((?!login|manifest.webmanifest|icon\\.svg|_next/static|_next/image|favicon.ico).*)'],
};
