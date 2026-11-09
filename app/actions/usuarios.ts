'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isDbConfigured, prisma } from '@/lib/prisma';
import { COOKIE_ABIERTO, exigirPermiso, hashContrasena, hayUsuarios } from '@/lib/auth';
import type { RolUsuario } from '@prisma/client';

const ROLES_VALIDOS: RolUsuario[] = ['ADMIN', 'OPERADOR', 'VENDEDOR', 'CONSULTA'];

function validarDatosUsuario(formData: FormData): { nombre: string; email: string; contrasena: string } {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const contrasena = String(formData.get('contrasena') ?? '');

  if (!nombre) {
    throw new Error('El nombre es obligatorio');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Escribe un correo válido');
  }

  if (contrasena.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  return { nombre, email, contrasena };
}

function validarRol(formData: FormData): RolUsuario {
  const rol = String(formData.get('rol') ?? '').trim().toUpperCase();
  if (!(ROLES_VALIDOS as string[]).includes(rol)) {
    throw new Error('El rol no es válido');
  }
  return rol as RolUsuario;
}

async function exigirEmailLibre(email: string): Promise<void> {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    throw new Error('Ya existe un usuario con ese correo');
  }
}

/**
 * Crea el primer usuario administrador. Solo funciona cuando todavía no
 * hay ningún usuario; después de eso hay que usar /usuarios como ADMIN.
 */
export async function crearPrimerUsuario(formData: FormData): Promise<void> {
  if (await hayUsuarios()) {
    throw new Error('Ya existen usuarios. Inicia sesión como administrador para crear más.');
  }

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para crear usuarios');
  }

  if (!process.env.MELMIR_AUTH_SECRET) {
    throw new Error('Falta configurar MELMIR_AUTH_SECRET en Vercel antes de usar usuarios.');
  }

  const { nombre, email, contrasena } = validarDatosUsuario(formData);
  await exigirEmailLibre(email);

  await prisma.usuario.create({
    data: {
      nombre,
      email,
      contrasenaHash: await hashContrasena(contrasena),
      rol: 'ADMIN',
      activo: true,
    },
  });

  // A partir de ahora la app exige login: se quita la marca de modo abierto.
  cookies().delete(COOKIE_ABIERTO);

  revalidatePath('/usuarios');
  redirect('/login');
}

/** Crea un usuario nuevo (solo ADMIN). */
export async function crearUsuario(formData: FormData): Promise<void> {
  await exigirPermiso('usuarios');

  if (!isDbConfigured()) {
    throw new Error('Configura DATABASE_URL en Vercel para crear usuarios');
  }

  const { nombre, email, contrasena } = validarDatosUsuario(formData);
  const rol = validarRol(formData);
  await exigirEmailLibre(email);

  await prisma.usuario.create({
    data: {
      nombre,
      email,
      contrasenaHash: await hashContrasena(contrasena),
      rol,
      activo: true,
    },
  });

  revalidatePath('/usuarios');
}

/** Cambia el rol de un usuario (solo ADMIN). No permite cambiar el propio rol. */
export async function cambiarRolUsuario(formData: FormData): Promise<void> {
  const sesion = await exigirPermiso('usuarios');

  const usuarioId = String(formData.get('usuarioId') ?? '').trim();
  const rol = validarRol(formData);

  if (!usuarioId) {
    throw new Error('Debes indicar el usuario');
  }

  if (sesion && sesion.id === usuarioId) {
    throw new Error('No puedes cambiar tu propio rol');
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { rol } });

  revalidatePath('/usuarios');
}

/** Activa o desactiva un usuario (solo ADMIN). No permite desactivarse a uno mismo. */
export async function cambiarEstadoUsuario(formData: FormData): Promise<void> {
  const sesion = await exigirPermiso('usuarios');

  const usuarioId = String(formData.get('usuarioId') ?? '').trim();
  const activo = String(formData.get('activo') ?? '') === 'true';

  if (!usuarioId) {
    throw new Error('Debes indicar el usuario');
  }

  if (!activo && sesion && sesion.id === usuarioId) {
    throw new Error('No puedes desactivarte a ti mismo');
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { activo } });

  revalidatePath('/usuarios');
}
