/**
 * Seguimiento de lotes: línea de tiempo, cuentas regresivas y
 * recomendaciones personalizadas por lote.
 *
 * Lógica pura (sin acceso a base de datos ni a 'use server'): las
 * páginas y las acciones la importan y le pasan los datos ya leídos.
 * Todas las recomendaciones se calculan solo con datos reales del lote
 * (etapas, notas, stock, ventas); nada se inventa.
 */

export type NivelRecomendacion = 'urgente' | 'sugerencia' | 'info';

export type RecomendacionLote = {
  nivel: NivelRecomendacion;
  mensaje: string;
};

export type EtapaSeguimiento = {
  id: string;
  nombre: string;
  orden: number;
  estado: string;
  fechaPlaneada: Date | null;
  fechaReal: Date | null;
  fechaInicio: Date | null;
};

export type NotaSeguimiento = {
  id: string;
  tipo: string;
  texto: string;
  insumoId: string | null;
  insumoNombre: string | null;
  etapa: string | null;
  resuelto: boolean;
  createdAt: Date;
};

export type InsumoRecetaSeguimiento = {
  insumoId: string;
  nombre: string;
  cantidadTeorica: number;
  stockActual: number;
  unidadMedida: string;
};

export type LoteSeguimientoInput = {
  id: string;
  codigoLote: string;
  estado: string;
  recetaNombre: string;
  etapas: EtapaSeguimiento[];
  notas: NotaSeguimiento[];
  insumosReceta: InsumoRecetaSeguimiento[];
  botellasEnStock: number;
  ventasCount: number;
  botellasVendidas: number;
};

export type CuentaRegresiva = {
  /** Días que faltan (positivo), 0 = hoy, negativo = vencido. null = sin fecha. */
  dias: number | null;
  texto: string;
  tono: 'rojo' | 'ambar' | 'verde' | 'gris';
};

export type SeguimientoLote = {
  etapasHechas: number;
  etapasTotal: number;
  avancePorcentaje: number;
  /** Fecha planeada de la última etapa pendiente (null si no hay fecha). */
  fechaEstimadaLista: Date | null;
  /** Cuenta regresiva del lote completo (según fechaEstimadaLista). */
  cuentaRegresivaLote: CuentaRegresiva;
  etapasVencidas: EtapaSeguimiento[];
  etapasPorVencer: EtapaSeguimiento[];
  problemasAbiertos: NotaSeguimiento[];
  problemasResueltos: NotaSeguimiento[];
  sinFechasPlaneadas: boolean;
  recomendaciones: RecomendacionLote[];
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function inicioDelDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Días enteros desde `hoy` hasta `fecha` (negativo si ya pasó). */
export function diasHasta(fecha: Date, hoy: Date = new Date()): number {
  return Math.round(
    (inicioDelDia(fecha).getTime() - inicioDelDia(hoy).getTime()) / MS_POR_DIA
  );
}

function formatearFechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Cuenta regresiva de una etapa según su fecha planeada y su estado.
 * Las etapas hechas muestran su fecha real; las pendientes sin fecha
 * dicen que no tienen fecha asignada.
 */
export function cuentaRegresivaEtapa(
  etapa: EtapaSeguimiento,
  hoy: Date = new Date()
): CuentaRegresiva {
  if (etapa.estado === 'HECHA') {
    return {
      dias: null,
      texto: etapa.fechaReal ? `Hecha el ${formatearFechaCorta(etapa.fechaReal)}` : 'Hecha',
      tono: 'verde',
    };
  }
  if (!etapa.fechaPlaneada) {
    return { dias: null, texto: 'Sin fecha planeada', tono: 'gris' };
  }
  const dias = diasHasta(etapa.fechaPlaneada, hoy);
  if (dias < 0) {
    return {
      dias,
      texto: `Vencida por ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
      tono: 'rojo',
    };
  }
  if (dias === 0) {
    return { dias, texto: 'Vence hoy', tono: 'ambar' };
  }
  if (dias === 1) {
    return { dias, texto: 'Falta 1 día', tono: 'ambar' };
  }
  return { dias, texto: `Faltan ${dias} días`, tono: 'ambar' };
}

const TONO_ESTILOS: Record<CuentaRegresiva['tono'], string> = {
  rojo: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  ambar: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  verde: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  gris: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function estiloCuentaRegresiva(tono: CuentaRegresiva['tono']): string {
  return TONO_ESTILOS[tono];
}

const NIVEL_ESTILOS: Record<NivelRecomendacion, { etiqueta: string; clases: string }> = {
  urgente: {
    etiqueta: 'Urgente',
    clases: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200',
  },
  sugerencia: {
    etiqueta: 'Sugerencia',
    clases:
      'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  },
  info: {
    etiqueta: 'Información',
    clases:
      'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
};

export function estiloRecomendacion(nivel: NivelRecomendacion) {
  return NIVEL_ESTILOS[nivel];
}

function recortar(texto: string, maximo = 120): string {
  return texto.length > maximo ? `${texto.slice(0, maximo).trim()}…` : texto;
}

/**
 * Calcula el seguimiento completo de un lote y sus recomendaciones
 * personalizadas, en orden de urgencia. Reglas (solo con datos reales):
 *
 * - Problema abierto → urgente, uno por problema (máx. 3 visibles).
 * - Etapa vencida sin hacer → urgente, una por etapa.
 * - Stock de un insumo de la receta menor que lo que pide la receta
 *   (lote abierto) → urgente, uno por insumo.
 * - Etapa que vence en 3 días o menos → sugerencia.
 * - Lote sin etapas → sugerencia de agregarlas.
 * - Lote con etapas pero sin ninguna fecha planeada → sugerencia.
 * - Fermentación en curso → información con los días que lleva
 *   (según fechaInicio; si no hay, sin días).
 * - Todas las etapas hechas y lote abierto → sugerencia de cerrarlo.
 * - Lote completado con botellas en stock y sin ventas → sugerencia.
 * - Lote completado con ventas → información con el resumen.
 * - Sin nada pendiente → información de que todo está en orden.
 */
export function calcularSeguimientoLote(
  lote: LoteSeguimientoInput,
  hoy: Date = new Date()
): SeguimientoLote {
  const abierto = lote.estado === 'PENDIENTE' || lote.estado === 'EN_PRODUCCION';
  const etapas = [...lote.etapas].sort((a, b) => a.orden - b.orden);
  const etapasHechas = etapas.filter((e) => e.estado === 'HECHA').length;
  const etapasTotal = etapas.length;
  const avancePorcentaje = etapasTotal > 0 ? Math.round((etapasHechas / etapasTotal) * 100) : 0;

  const pendientes = etapas.filter((e) => e.estado !== 'HECHA');
  const pendientesConFecha = pendientes.filter((e) => e.fechaPlaneada !== null);
  const fechaEstimadaLista =
    pendientesConFecha.length > 0
      ? pendientesConFecha[pendientesConFecha.length - 1].fechaPlaneada
      : null;

  const cuentaRegresivaLote: CuentaRegresiva = (() => {
    if (lote.estado === 'COMPLETADO') {
      return { dias: null, texto: 'Lote completado', tono: 'verde' };
    }
    if (lote.estado === 'CANCELADO') {
      return { dias: null, texto: 'Lote cancelado', tono: 'gris' };
    }
    if (!fechaEstimadaLista) {
      return { dias: null, texto: 'Sin fecha estimada', tono: 'gris' };
    }
    const dias = diasHasta(fechaEstimadaLista, hoy);
    if (dias < 0) {
      return {
        dias,
        texto: `Retrasado por ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
        tono: 'rojo',
      };
    }
    if (dias === 0) {
      return { dias, texto: 'Listo hoy', tono: 'ambar' };
    }
    if (dias === 1) {
      return { dias, texto: 'Listo en 1 día', tono: 'ambar' };
    }
    return { dias, texto: `Listo en ${dias} días`, tono: 'ambar' };
  })();

  const etapasVencidas = pendientes.filter(
    (e) => e.fechaPlaneada && diasHasta(e.fechaPlaneada, hoy) < 0
  );
  const etapasPorVencer = pendientes.filter((e) => {
    if (!e.fechaPlaneada) return false;
    const dias = diasHasta(e.fechaPlaneada, hoy);
    return dias >= 0 && dias <= 3;
  });

  const problemasAbiertos = lote.notas.filter((n) => n.tipo === 'PROBLEMA' && !n.resuelto);
  const problemasResueltos = lote.notas.filter((n) => n.tipo === 'PROBLEMA' && n.resuelto);
  const sinFechasPlaneadas =
    etapasTotal > 0 && etapas.every((e) => e.fechaPlaneada === null);

  const recomendaciones: RecomendacionLote[] = [];

  // 1. Problemas abiertos (urgente, máx. 3).
  for (const problema of problemasAbiertos.slice(0, 3)) {
    const contexto = problema.insumoNombre
      ? ` (insumo: ${problema.insumoNombre})`
      : problema.etapa
        ? ` (etapa: ${problema.etapa})`
        : '';
    recomendaciones.push({
      nivel: 'urgente',
      mensaje: `Problema sin resolver${contexto}: «${recortar(problema.texto)}» Revísalo y márcalo como resuelto antes de seguir con el lote.`,
    });
  }
  if (problemasAbiertos.length > 3) {
    recomendaciones.push({
      nivel: 'urgente',
      mensaje: `Hay ${problemasAbiertos.length} problemas sin resolver en este lote. Atiende primero los más urgentes.`,
    });
  }

  // 2. Etapas vencidas (urgente).
  for (const etapa of etapasVencidas) {
    const dias = etapa.fechaPlaneada ? Math.abs(diasHasta(etapa.fechaPlaneada, hoy)) : 0;
    recomendaciones.push({
      nivel: 'urgente',
      mensaje: `La etapa ${etapa.nombre} venció hace ${dias} día${dias === 1 ? '' : 's'}: hazla cuanto antes para no retrasar el lote.`,
    });
  }

  // 3. Stock insuficiente para la receta (lote abierto, urgente).
  if (abierto) {
    for (const insumo of lote.insumosReceta) {
      if (insumo.stockActual < insumo.cantidadTeorica) {
        recomendaciones.push({
          nivel: 'urgente',
          mensaje: `Falta stock de ${insumo.nombre} para este lote: tienes ${insumo.stockActual} ${insumo.unidadMedida} y la receta pide ${insumo.cantidadTeorica} ${insumo.unidadMedida}. Repón antes de empezar.`,
        });
      }
    }
  }

  // 4. Etapas que vencen en 3 días o menos (sugerencia).
  for (const etapa of etapasPorVencer) {
    const dias = etapa.fechaPlaneada ? diasHasta(etapa.fechaPlaneada, hoy) : 0;
    recomendaciones.push({
      nivel: 'sugerencia',
      mensaje:
        dias === 0
          ? `La etapa ${etapa.nombre} vence hoy: prepara lo necesario (insumos, equipo) para hacerla.`
          : `La etapa ${etapa.nombre} vence en ${dias} día${dias === 1 ? '' : 's'}: prepara lo necesario (insumos, equipo) para hacerla.`,
    });
  }

  // 5. Sin etapas (sugerencia).
  if (etapasTotal === 0) {
    recomendaciones.push({
      nivel: 'sugerencia',
      mensaje:
        'Este lote no tiene etapas: agrega las 4 (Fermentación, Trasiego, Clarificación, Embotellado) para llevar el seguimiento con tiempos.',
    });
  }

  // 6. Sin fechas planeadas (sugerencia).
  if (etapasTotal > 0 && sinFechasPlaneadas && abierto) {
    recomendaciones.push({
      nivel: 'sugerencia',
      mensaje:
        'Este lote no tiene fechas planeadas: asigna fechas a sus etapas para ver la cuenta regresiva y la fecha estimada en que estará listo.',
    });
  }

  // 7. Fermentación en curso (información con días que lleva).
  const fermentacion = etapas.find(
    (e) => e.nombre.toLowerCase().includes('ferment') && e.estado === 'EN_CURSO'
  );
  if (fermentacion) {
    if (fermentacion.fechaInicio) {
      const diasLleva = Math.floor(
        (inicioDelDia(new Date()).getTime() - inicioDelDia(fermentacion.fechaInicio).getTime()) /
          MS_POR_DIA
      );
      recomendaciones.push({
        nivel: 'info',
        mensaje: `Fermentación en curso: lleva ${Math.max(0, diasLleva)} día${diasLleva === 1 ? '' : 's'} desde el ${formatearFechaCorta(fermentacion.fechaInicio)}. Revísala según lo planeado.`,
      });
    } else {
      recomendaciones.push({
        nivel: 'info',
        mensaje:
          'Fermentación en curso: revísala según lo planeado y marca su avance cuando esté lista.',
      });
    }
  }

  // 8. Todas las etapas hechas y lote abierto (sugerencia).
  if (abierto && etapasTotal > 0 && etapasHechas === etapasTotal) {
    recomendaciones.push({
      nivel: 'sugerencia',
      mensaje:
        'Todas las etapas están hechas: ya puedes cerrar el lote y embotellar con las cantidades reales.',
    });
  }

  // 9. Lote completado sin ventas (sugerencia).
  if (lote.estado === 'COMPLETADO' && lote.botellasEnStock > 0 && lote.ventasCount === 0) {
    recomendaciones.push({
      nivel: 'sugerencia',
      mensaje: `Lote completado con ${lote.botellasEnStock} botellas en stock y sin ventas registradas: registra la primera venta o crea un pedido.`,
    });
  }

  // 10. Lote completado con ventas (información).
  if (lote.estado === 'COMPLETADO' && lote.ventasCount > 0) {
    recomendaciones.push({
      nivel: 'info',
      mensaje: `Lote completado y vendiendo: ${lote.botellasVendidas} botella${lote.botellasVendidas === 1 ? '' : 's'} vendida${lote.botellasVendidas === 1 ? '' : 's'} y ${lote.botellasEnStock} en stock.`,
    });
  }

  // 11. Sin pendientes (información).
  if (recomendaciones.length === 0 && abierto) {
    const proxima = pendientesConFecha[0];
    recomendaciones.push({
      nivel: 'info',
      mensaje: proxima
        ? `Todo en orden: la próxima etapa es ${proxima.nombre}, planeada para el ${formatearFechaCorta(proxima.fechaPlaneada as Date)}.`
        : 'Todo en orden: no hay etapas vencidas ni problemas abiertos en este lote.',
    });
  }

  return {
    etapasHechas,
    etapasTotal,
    avancePorcentaje,
    fechaEstimadaLista,
    cuentaRegresivaLote,
    etapasVencidas,
    etapasPorVencer,
    problemasAbiertos,
    problemasResueltos,
    sinFechasPlaneadas,
    recomendaciones,
  };
}
