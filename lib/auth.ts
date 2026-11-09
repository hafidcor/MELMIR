import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import type { RolUsuario } from '@prisma/client';

import { isDbConfigured, prisma } from '@/lib/prisma';

export const COOKIE_SESION = 'melmir-sesion';
export const COOKIE_ABIERTO = 'melmir-auth';

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
};

export type Permiso =
  | 'ventas'
  | 'insumos'
  | 'produccion'
  | 'recetas'
  | 'archivos'
  | 'usuarios'
  | 'respaldos'
  | 'clientes'
  | 'pedidos';

const PERMISOS: Record<Permiso, RolUsuario[]> = {
  ventas: ['ADMIN', 'VENDEDOR'],
  insumos: ['ADMIN', 'OPERADOR'],
  produccion: ['ADMIN', 'OPERADOR'],
  recetas: ['ADMIN', 'OPERADOR'],
  archivos: ['ADMIN', 'OPERADOR', 'VENDEDOR'],
  usuarios: ['ADMIN'],
  respaldos: ['ADMIN'],
  clientes: ['ADMIN', 'OPERADOR', 'VENDEDOR'],
  pedidos: ['ADMIN', 'OPERADOR', 'VENDEDOR'],
};

const DURACION_SESION_SEGUNDOS = 7 * 24 * 3600;

function obtenerSecreto(): Uint8Array | null {
  const secreto = process.env.MELMIR_AUTH_SECRET;
  if (typeof secreto !== 'string' || secreto.trim().length === 0) {
    return null;
  }
  return new TextEncoder().encode(secreto);
}

/**
 * True si existe al menos un usuario en la base de datos.
 * False ante cualquier error o sin base de datos configurada: en ese
 * caso la app funciona en modo abierto, como antes de tener usuarios.
 */
export async function hayUsuarios(): Promise<boolean> {
  if (!isDbConfigured()) {
    return false;
  }

  try {
    return (await prisma.usuario.count()) > 0;
  } catch (error) {
    console.error('hayUsuarios: sin acceso a la base de datos', error);
    return false;
  }
}

/**
 * Lee la sesión del JWT guardado en la cookie. Devuelve null si no hay
 * cookie, si el token no es válido o si falta MELMIR_AUTH_SECRET.
 */
export async function obtenerSesion(): Promise<Sesion | null> {
  const token = cookies().get(COOKIE_SESION)?.value;
  if (!token) {
    return null;
  }

  const secreto = obtenerSecreto();
  if (!secreto) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secreto, { algorithms: ['HS256'] });
    const id = typeof payload.sub === 'string' ? payload.sub : '';
    const nombre = typeof payload.nombre === 'string' ? payload.nombre : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const rolTexto = typeof payload.rol === 'string' ? payload.rol : '';
    const rolesValidos: string[] = ['ADMIN', 'OPERADOR', 'VENDEDOR', 'CONSULTA'];

    if (!id || !nombre || !email || !rolesValidos.includes(rolTexto)) {
      return null;
    }

    return { id, nombre, email, rol: rolTexto as RolUsuario };
  } catch {
    return null;
  }
}

/**
 * Exige el permiso indicado. En modo abierto (sin base de datos o sin
 * usuarios) devuelve null y deja pasar. Si hay usuarios: sin sesión
 * válida lanza Error('Inicia sesión para continuar'); si el rol no está
 * permitido lanza Error('Tu rol no permite esta acción').
 */
export async function exigirPermiso(permiso: Permiso): Promise<Sesion | null> {
  if (!isDbConfigured() || !(await hayUsuarios())) {
    return null;
  }

  const sesion = await obtenerSesion();
  if (!sesion) {
    throw new Error('Inicia sesión para continuar');
  }

  if (!PERMISOS[permiso].includes(sesion.rol)) {
    throw new Error('Tu rol no permite esta acción');
  }

  return sesion;
}

/**
 * Exige solo estar logueado cuando hay usuarios (para rutas de lectura
 * como las descargas CSV). En modo abierto devuelve null y deja pasar.
 */
export async function exigirSesion(): Promise<Sesion | null> {
  if (!isDbConfigured() || !(await hayUsuarios())) {
    return null;
  }

  const sesion = await obtenerSesion();
  if (!sesion) {
    throw new Error('Inicia sesión para continuar');
  }

  return sesion;
}

export async function hashContrasena(contrasena: string): Promise<string> {
  return bcrypt.hash(contrasena, 10);
}

export async function verificarContrasena(
  contrasena: string,
  contrasenaHash: string
): Promise<boolean> {
  return bcrypt.compare(contrasena, contrasenaHash);
}

/**
 * Crea el JWT de sesión (7 días) y lo guarda en la cookie httpOnly.
 * El usuario debe traer id, nombre, email y rol.
 */
export async function crearCookieSesion(usuario: {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}): Promise<void> {
  const secreto = obtenerSecreto();
  if (!secreto) {
    throw new Error('Falta configurar MELMIR_AUTH_SECRET en Vercel antes de usar usuarios.');
  }

  const token = await new SignJWT({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secreto);

  cookies().set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}
