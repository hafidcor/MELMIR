import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DbWarning } from '@/components/db-warning';
import { PosForm } from '@/components/pos-form';
import { obtenerClientes } from '@/app/actions/clientes';
import { obtenerApartadasPorReceta } from '@/app/actions/pedidos';
import { obtenerProductosParaVenta } from '@/app/actions/ventas';

export const dynamic = 'force-dynamic';

/**
 * Punto de venta rápido para ferias y eventos: elegir producto, cantidad
 * con botones +/−, total a la vista y registrar la venta en un toque.
 * Reutiliza registrarVenta: descuenta stock en transacción y puede
 * quedar pagada o pendiente (a crédito) con cliente opcional.
 */
export default async function PosPage() {
  const [productos, clientes, apartadas] = await Promise.all([
    obtenerProductosParaVenta(),
    obtenerClientes(),
    obtenerApartadasPorReceta(),
  ]);

  const productosPos = productos.map((p) => ({
    id: p.id,
    recetaId: p.receta.id,
    recetaNombre: p.receta.nombre,
    codigoLote: p.loteProduccion.codigoLote,
    botellasEnStock: p.botellasEnStock,
    precioSugerido: p.precioSugerido,
    apartadas: apartadas[p.receta.id] ?? 0,
  }));

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <DbWarning />

        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">MELMIR</p>
          <h1 className="mt-2 text-3xl font-bold">Punto de venta</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Venta rápida en ferias y eventos, desde el teléfono.
          </p>
        </header>

        <PosForm productos={productosPos} clientes={clientes} />

        <Card>
          <CardHeader>
            <CardTitle>¿Cómo funciona?</CardTitle>
            <CardDescription>Lo que hace y lo que no hace el punto de venta</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Registra la venta y descuenta las botellas del lote al momento.</li>
              <li>El precio sugerido viene de Precios (costo + impuestos + margen); lo puedes cambiar.</li>
              <li>Las botellas apartadas en pedidos pendientes ya están restadas de los disponibles.</li>
              <li>No cobra con tarjeta ni genera facturas: el cobro es aparte.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
