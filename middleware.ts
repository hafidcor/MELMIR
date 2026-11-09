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
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
