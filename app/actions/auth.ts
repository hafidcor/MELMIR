'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isDbConfigured, prisma } from '@/lib/prisma';
import {
  COOKIE_ABIERTO,
  COOKIE_SESION,
  crearCookieSesion,
  hayUsuarios,
  verificarContrasena,
} from '@/lib/auth';

function destinoSeguro(next: string | null): string {
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/';
}

/**
 * Inicio de sesión compatible con useFormState: devuelve { error } y
 * nunca lanza para errores de credenciales. Al éxito crea la cookie de
 * sesión y redirige a `next` o a '/'.
 */
export async function iniciarSesion(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const contrasena = String(formData.get('contrasena') ?? '');
  const next = destinoSeguro(String(formData.get('next') ?? '') || null);

  if (!email || !contrasena) {
    return { error: 'Escribe tu correo y tu contraseña.' };
  }

  if (!isDbConfigured()) {
    return { error: 'Configura DATABASE_URL en Vercel para iniciar sesión.' };
  }

  if (!process.env.MELMIR_AUTH_SECRET) {
    return { error: 'Falta configurar MELMIR_AUTH_SECRET en Vercel antes de usar usuarios.' };
  }

  let usuario: { id: string; nombre: string; email: string; contrasenaHash: string; rol: string; activo: boolean } | null;
  try {
    usuario = await prisma.usuario.findUnique({ where: { email } });
  } catch (error) {
    console.error('iniciarSesion: sin acceso a la base de datos', error);
    return { error: 'No se pudo conectar con la base de datos. Inténtalo de nuevo.' };
  }

  if (!usuario || !usuario.activo) {
    return { error: 'Correo o contraseña incorrectos.' };
  }

  const valida = await verificarContrasena(contrasena, usuario.contrasenaHash);
  if (!valida) {
    return { error: 'Correo o contraseña incorrectos.' };
  }

  await crearCookieSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol as 'ADMIN' | 'OPERADOR' | 'VENDEDOR' | 'CONSULTA',
  });

  redirect(next);
}

/** Cierra la sesión borrando la cookie y vuelve al login. */
export async function cerrarSesion(): Promise<void> {
  cookies().delete(COOKIE_SESION);
  redirect('/login');
}

/**
 * Modo abierto (sin usuarios): marca la app como abierta con la cookie
 * melmir-auth='off' para que el middleware deje pasar, y va al inicio.
 * Si ya hay usuarios, no hace nada salvo ir al login.
 */
export async function entrarSinLogin(): Promise<void> {
  if (await hayUsuarios()) {
    redirect('/login');
  }

  cookies().set(COOKIE_ABIERTO, 'off', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });
  redirect('/');
}
