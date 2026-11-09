/**
 * Gráficas SVG ligeras para el Dashboard de MELMIR.
 *
 * Sin dependencias externas: solo SVG + Tailwind. Todos los componentes son
 * responsivos (`width: 100%` con `viewBox`) y usan clases Tailwind con
 * variante `dark:` para que los textos y ejes se lean en claro y oscuro.
 * Los colores de datos usan la paleta de Tailwind (emerald / sky / amber /
 * blue / red) y se escriben como clases literales para que Tailwind las
 * detecte en el build.
 */

export type DatoVentasMes = {
  etiqueta: string;
  botellas: number;
  ingresos: number;
};

export type DatoStockInsumo = {
  nombre: string;
  stock: number;
  minimo: number;
  unidad: string;
};

export type DatoLoteEstado = {
  estado: string;
  cantidad: number;
};

export type GraficoBarrasVentasProps = {
  datos: DatoVentasMes[];
};

export type GraficoStockInsumosProps = {
  datos: DatoStockInsumo[];
};

export type GraficoDonaLotesProps = {
  datos: DatoLoteEstado[];
};

function formatearMoneda(valor: number): string {
  return `$${valor.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

function truncar(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

function numeroSeguro(valor: number): number {
  return Number.isFinite(valor) ? Math.max(0, valor) : 0;
}

function MensajeVacio({ children }: { children: string }) {
  return (
    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>
  );
}

/**
 * Barras de botellas vendidas por mes, con la línea de ingresos ($) en azul.
 * Si todos los valores son 0 (o no hay datos), muestra "Aún no hay ventas".
 */
export function GraficoBarrasVentas({ datos }: GraficoBarrasVentasProps) {
  const meses = datos.map((d) => ({
    etiqueta: d.etiqueta,
    botellas: numeroSeguro(d.botellas),
    ingresos: numeroSeguro(d.ingresos),
  }));
  const hayVentas = meses.some((m) => m.botellas > 0 || m.ingresos > 0);
  if (meses.length === 0 || !hayVentas) {
    return <MensajeVacio>Aún no hay ventas</MensajeVacio>;
  }

  const ancho = 600;
  const alto = 280;
  const arriba = 28;
  const abajo = 52;
  const altoGrafico = alto - arriba - abajo;
  const baseY = arriba + altoGrafico;

  const maxBotellas = Math.max(1, ...meses.map((m) => m.botellas));
  const maxIngresos = Math.max(0, ...meses.map((m) => m.ingresos));
  const ranura = ancho / meses.length;
  const anchoBarra = Math.min(56, ranura * 0.55);

  const centroX = (i: number): number => ranura * i + ranura / 2;
  const alturaBarra = (botellas: number): number => (botellas / maxBotellas) * altoGrafico;
  const puntoIngresos = (i: number): { x: number; y: number } => ({
    x: centroX(i),
    y: baseY - (meses[i].ingresos / Math.max(1, maxIngresos)) * altoGrafico,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
          Botellas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-sky-500" />
          Ingresos ($)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="h-auto w-full"
        role="img"
        aria-label="Ventas por mes: botellas vendidas e ingresos"
      >
        {/* Eje base */}
        <line
          x1={0}
          y1={baseY}
          x2={ancho}
          y2={baseY}
          className="stroke-slate-300 dark:stroke-slate-700"
          strokeWidth={1}
        />
        {meses.map((mes, i) => {
          const altura = alturaBarra(mes.botellas);
          const x = centroX(i) - anchoBarra / 2;
          const y = baseY - altura;
          return (
            <g key={`${mes.etiqueta}-${i}`}>
              <rect
                x={x}
                y={y}
                width={anchoBarra}
                height={Math.max(altura, 0)}
                rx={4}
                className="fill-emerald-500"
              >
                <title>{`${mes.etiqueta}: ${mes.botellas} bot. · ${formatearMoneda(mes.ingresos)}`}</title>
              </rect>
              {mes.botellas > 0 && (
                <text
                  x={centroX(i)}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  className="fill-slate-700 dark:fill-slate-200"
                >
                  {mes.botellas}
                </text>
              )}
              <text
                x={centroX(i)}
                y={alto - 32}
                textAnchor="middle"
                fontSize={12}
                className="fill-slate-500 capitalize dark:fill-slate-400"
              >
                {mes.etiqueta}
              </text>
              <text
                x={centroX(i)}
                y={alto - 14}
                textAnchor="middle"
                fontSize={11}
                className="fill-slate-400 dark:fill-slate-500"
              >
                {formatearMoneda(mes.ingresos)}
              </text>
            </g>
          );
        })}
        {/* Línea de ingresos (solo si hay algún ingreso mayor que 0) */}
        {maxIngresos > 0 && (
          <g>
            <polyline
              points={meses.map((_, i) => `${puntoIngresos(i).x},${puntoIngresos(i).y}`).join(' ')}
              fill="none"
              className="stroke-sky-500"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {meses.map((mes, i) => (
              <circle
                key={`ingreso-${i}`}
                cx={puntoIngresos(i).x}
                cy={puntoIngresos(i).y}
                r={4.5}
                className="fill-sky-500"
              >
                <title>{`${mes.etiqueta}: ${formatearMoneda(mes.ingresos)}`}</title>
              </circle>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Barras horizontales de stock por insumo, con una marca ámbar vertical que
 * indica el stock mínimo. En rojo el insumo con stock <= mínimo, en verde
 * el resto. Sin datos muestra un mensaje vacío.
 */
export function GraficoStockInsumos({ datos }: GraficoStockInsumosProps) {
  const insumos = datos.map((d) => ({
    nombre: d.nombre,
    stock: numeroSeguro(d.stock),
    minimo: numeroSeguro(d.minimo),
    unidad: d.unidad,
  }));
  if (insumos.length === 0) {
    return <MensajeVacio>Aún no hay insumos registrados</MensajeVacio>;
  }

  const ancho = 600;
  const altoFila = 64;
  const arriba = 10;
  const alto = arriba + insumos.length * altoFila + 6;
  const maxEscala = Math.max(1, ...insumos.flatMap((i) => [i.stock, i.minimo]));

  return (
    <div>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="h-auto w-full"
        role="img"
        aria-label="Stock de insumos frente a su stock mínimo"
      >
        {insumos.map((insumo, i) => {
          const y0 = arriba + i * altoFila;
          const enBajo = insumo.stock <= insumo.minimo;
          const anchoBarra = insumo.stock > 0 ? Math.max(2, (insumo.stock / maxEscala) * ancho) : 0;
          const xMinimo = (insumo.minimo / maxEscala) * ancho;
          return (
            <g key={`${insumo.nombre}-${i}`}>
              <text
                x={0}
                y={y0 + 16}
                fontSize={13}
                fontWeight={600}
                className="fill-slate-700 dark:fill-slate-200"
              >
                {truncar(insumo.nombre, 30)}
              </text>
              <text
                x={ancho}
                y={y0 + 16}
                textAnchor="end"
                fontSize={12}
                className="fill-slate-500 dark:fill-slate-400"
              >
                {`${insumo.stock} ${insumo.unidad} / mín. ${insumo.minimo}`}
              </text>
              {/* Pista de fondo */}
              <rect
                x={0}
                y={y0 + 26}
                width={ancho}
                height={16}
                rx={8}
                className="fill-slate-200 dark:fill-slate-800"
              />
              <rect
                x={0}
                y={y0 + 26}
                width={anchoBarra}
                height={16}
                rx={8}
                className={enBajo ? 'fill-red-500' : 'fill-emerald-500'}
              >
                <title>{`${insumo.nombre}: ${insumo.stock} ${insumo.unidad} (mín. ${insumo.minimo})`}</title>
              </rect>
              {/* Marca vertical del stock mínimo */}
              {insumo.minimo > 0 && (
                <line
                  x1={xMinimo}
                  y1={y0 + 22}
                  x2={xMinimo}
                  y2={y0 + 46}
                  className="stroke-amber-500"
                  strokeWidth={3}
                  strokeLinecap="round"
                >
                  <title>{`Mínimo: ${insumo.minimo} ${insumo.unidad}`}</title>
                </line>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
          Stock suficiente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          Stock bajo (≤ mínimo)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-0.5 bg-amber-500" />
          Stock mínimo
        </span>
      </div>
    </div>
  );
}

const COLORES_LOTE: Record<string, { trazo: string; punto: string; etiqueta: string }> = {
  PENDIENTE: { trazo: 'stroke-amber-500', punto: 'bg-amber-500', etiqueta: 'Pendiente' },
  EN_PRODUCCION: { trazo: 'stroke-blue-500', punto: 'bg-blue-500', etiqueta: 'En producción' },
  COMPLETADO: { trazo: 'stroke-emerald-500', punto: 'bg-emerald-500', etiqueta: 'Completado' },
  CANCELADO: { trazo: 'stroke-red-500', punto: 'bg-red-500', etiqueta: 'Cancelado' },
};

const COLOR_LOTE_DEFECTO = { trazo: 'stroke-slate-400', punto: 'bg-slate-400' };

const ORDEN_ESTADOS_LOTE = ['PENDIENTE', 'EN_PRODUCCION', 'COMPLETADO', 'CANCELADO'];

/**
 * Dona de lotes por estado, con leyenda (estado, cantidad y color).
 * Sin lotes muestra un mensaje vacío.
 */
export function GraficoDonaLotes({ datos }: GraficoDonaLotesProps) {
  const segmentos = datos
    .map((d) => ({ estado: d.estado, cantidad: numeroSeguro(d.cantidad) }))
    .filter((d) => d.cantidad > 0)
    .sort((a, b) => {
      const ordenA = ORDEN_ESTADOS_LOTE.indexOf(a.estado);
      const ordenB = ORDEN_ESTADOS_LOTE.indexOf(b.estado);
      return (ordenA === -1 ? 99 : ordenA) - (ordenB === -1 ? 99 : ordenB);
    });

  const total = segmentos.reduce((suma, s) => suma + s.cantidad, 0);
  if (total === 0) {
    return <MensajeVacio>Aún no hay lotes registrados</MensajeVacio>;
  }

  const radio = 80;
  const circunferencia = 2 * Math.PI * radio;
  const separacion = segmentos.length > 1 ? 2 : 0;

  let acumulado = 0;
  const arcos = segmentos.map((segmento) => {
    const longitud = (segmento.cantidad / total) * circunferencia;
    const arco = {
      estado: segmento.estado,
      cantidad: segmento.cantidad,
      longitud: Math.max(longitud - separacion, 0.5),
      desplazamiento: -acumulado,
    };
    acumulado += longitud;
    return arco;
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <svg
        viewBox="0 0 200 200"
        className="h-44 w-44 shrink-0"
        role="img"
        aria-label={`Lotes por estado: ${total} lotes en total`}
      >
        <circle
          cx={100}
          cy={100}
          r={radio}
          fill="none"
          strokeWidth={30}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <g transform="rotate(-90 100 100)">
          {arcos.map((arco) => {
            const color = COLORES_LOTE[arco.estado] ?? COLOR_LOTE_DEFECTO;
            return (
              <circle
                key={arco.estado}
                cx={100}
                cy={100}
                r={radio}
                fill="none"
                strokeWidth={30}
                strokeDasharray={`${arco.longitud} ${circunferencia - arco.longitud}`}
                strokeDashoffset={arco.desplazamiento}
                className={color.trazo}
              >
                <title>{`${COLORES_LOTE[arco.estado]?.etiqueta ?? arco.estado}: ${arco.cantidad}`}</title>
              </circle>
            );
          })}
        </g>
        <text
          x={100}
          y={96}
          textAnchor="middle"
          fontSize={28}
          fontWeight={700}
          className="fill-slate-900 dark:fill-slate-100"
        >
          {total}
        </text>
        <text
          x={100}
          y={118}
          textAnchor="middle"
          fontSize={12}
          className="fill-slate-500 dark:fill-slate-400"
        >
          lotes
        </text>
      </svg>
      <ul className="w-full flex-1 space-y-2">
        {segmentos.map((segmento) => {
          const color = COLORES_LOTE[segmento.estado] ?? COLOR_LOTE_DEFECTO;
          const etiqueta = COLORES_LOTE[segmento.estado]?.etiqueta ?? segmento.estado;
          return (
            <li key={segmento.estado} className="flex items-center gap-2 text-sm">
              <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${color.punto}`} />
              <span className="text-slate-700 dark:text-slate-200">{etiqueta}</span>
              <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">
                {segmento.cantidad}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
