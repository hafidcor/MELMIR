'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-slate-500">
          No pudimos cargar esta sección. Si el problema continúa, revisa que
          DATABASE_URL esté configurada en Vercel.
        </p>
        {error?.message && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-600">
            {error.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
