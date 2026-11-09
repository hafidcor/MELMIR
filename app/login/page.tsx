import Link from 'next/link';
import { redirect } from 'next/navigation';

import { entrarSinLogin } from '@/app/actions/auth';
import { hayUsuarios, obtenerSesion } from '@/lib/auth';
import FormularioLogin from './formulario-login';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const sesion = await obtenerSesion();
  if (sesion) {
    redirect('/');
  }

  const next =
    typeof searchParams?.next === 'string' &&
    searchParams.next.startsWith('/') &&
    !searchParams.next.startsWith('//')
      ? searchParams.next
      : '/';

  const hay = await hayUsuarios();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">
            M
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            MELMIR
          </p>
          <h1 className="mt-2 text-3xl font-bold">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ERP de hidromiel
          </p>
        </header>

        {!hay ? (
          <section className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Aún no hay usuarios: la app está abierta.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Puedes seguir usando MELMIR sin iniciar sesión, o crear el primer usuario
              administrador para protegerla con contraseña.
            </p>
            <form action={entrarSinLogin}>
              <button
                type="submit"
                className="h-12 w-full rounded-md bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700"
              >
                Entrar sin login
              </button>
            </form>
            <p className="text-center text-sm">
              <Link href="/usuarios" className="font-medium text-emerald-700 underline dark:text-emerald-400">
                Crear el primer usuario administrador
              </Link>
            </p>
          </section>
        ) : (
          <section className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
            <FormularioLogin next={next} />
          </section>
        )}
      </div>
    </main>
  );
}
