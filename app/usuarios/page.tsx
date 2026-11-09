import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isDbConfigured, prisma } from '@/lib/prisma';
import { hayUsuarios, obtenerSesion } from '@/lib/auth';
import {
  cambiarEstadoUsuario,
  cambiarRolUsuario,
  crearPrimerUsuario,
  crearUsuario,
} from '@/app/actions/usuarios';

export const dynamic = 'force-dynamic';

const inputClass =
  'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const selectClass =
  'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-200';

const ROLES = ['ADMIN', 'OPERADOR', 'VENDEDOR', 'CONSULTA'] as const;

function formatFecha(fecha: Date) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function UsuariosPage() {
  const hay = await hayUsuarios();

  if (!hay) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
              MELMIR
            </p>
            <h1 className="mt-2 text-3xl font-bold">Usuarios</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay usuarios: la app está abierta. Crea el primer usuario administrador
              para protegerla con inicio de sesión.
            </p>
          </header>

          <section className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Crear primer usuario administrador</h2>
            <p className="mt-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Antes de crear el primer usuario hay que poner MELMIR_AUTH_SECRET en Vercel
              (Settings &gt; Environment Variables). Sin esa variable no se puede iniciar sesión.
            </p>
            <form action={crearPrimerUsuario} className="mt-4 grid gap-4">
              <div className="space-y-2">
                <label htmlFor="nombre" className={labelClass}>
                  Nombre
                </label>
                <input id="nombre" name="nombre" required placeholder="Tu nombre" className={inputClass} />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className={labelClass}>
                  Correo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contrasena" className={labelClass}>
                  Contraseña (mínimo 8 caracteres)
                </label>
                <input
                  id="contrasena"
                  name="contrasena"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Contraseña segura"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="h-12 w-full rounded-md bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700"
              >
                Crear administrador
              </button>
            </form>
          </section>

          <p className="text-sm">
            <Link href="/login" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== 'ADMIN') {
    redirect('/login');
  }

  const usuarios = isDbConfigured()
    ? await prisma.usuario.findMany({
        select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            MELMIR
          </p>
          <h1 className="mt-2 text-3xl font-bold">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Solo los administradores pueden crear usuarios y cambiar roles o estados.
          </p>
        </header>

        <section className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Crear usuario</h2>
          <form action={crearUsuario} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="nombre" className={labelClass}>
                Nombre
              </label>
              <input id="nombre" name="nombre" required placeholder="Nombre" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className={labelClass}>
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="usuario@correo.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contrasena" className={labelClass}>
                Contraseña (mínimo 8 caracteres)
              </label>
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                required
                minLength={8}
                placeholder="Contraseña segura"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rol" className={labelClass}>
                Rol
              </label>
              <select id="rol" name="rol" defaultValue="CONSULTA" className={selectClass}>
                {ROLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-12 rounded-md bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 md:col-span-2"
            >
              Crear usuario
            </button>
          </form>
        </section>

        <section className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Nombre</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Correo</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Rol</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Creado</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr
                  key={usuario.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-4 py-3 font-medium">{usuario.nombre}</td>
                  <td className="px-4 py-3">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <form action={cambiarRolUsuario} className="flex items-center gap-2">
                      <input type="hidden" name="usuarioId" value={usuario.id} />
                      <select
                        name="rol"
                        defaultValue={usuario.rol}
                        disabled={usuario.id === sesion.id}
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      >
                        {ROLES.map((rol) => (
                          <option key={rol} value={rol}>
                            {rol}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={usuario.id === sesion.id}
                        className="rounded-md bg-slate-200 px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                      >
                        Cambiar rol
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">{usuario.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-4 py-3">{formatFecha(usuario.createdAt)}</td>
                  <td className="px-4 py-3">
                    <form action={cambiarEstadoUsuario} className="inline">
                      <input type="hidden" name="usuarioId" value={usuario.id} />
                      <input type="hidden" name="activo" value={usuario.activo ? 'false' : 'true'} />
                      <button
                        type="submit"
                        disabled={usuario.id === sesion.id && usuario.activo}
                        className="rounded-md bg-slate-200 px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                      >
                        {usuario.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuarios.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              No hay usuarios registrados.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
