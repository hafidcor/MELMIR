'use server';

import { isDbConfigured, prisma } from '@/lib/prisma';
import {
  calcularSeguimientoLote,
  cuentaRegresivaEtapa,
  diasHasta,
  type LoteSeguimientoInput,
} from '@/app/lib/seguimiento';
import { obtenerSeguimientoDashboard } from '@/app/actions/seguimiento';
import { obtenerInsumosStockBajo, obtenerProximasEtapas } from '@/app/actions/alertas';
import { obtenerResumenVentas } from '@/app/actions/ventas';

/**
 * Asistente MELMIR: chat de seguimiento por reglas sobre los datos
 * reales de la app. Sin servicios externos de IA ni claves de API
 * (cero costo, sin cuentas nuevas) y SOLO lectura: nunca crea, edita
 * ni borra nada. Cualquier rol puede preguntar, CONSULTA incluido.
 *
 * Intenciones (español, tolerante a acentos, mayúsculas y sinónimos):
 * resumen de hoy · vencimientos (hoy / esta semana / vencidas) ·
 * estado de un lote por código (LT-001…) · problemas abiertos ·
 * stock bajo y faltantes · recomendaciones · ventas/clientes/pedidos ·
 * botellas en stock · lotes abiertos. Si no entiende, lo dice y
 * propone preguntas de ejemplo.
 */

const PREGUNTAS_EJEMPLO = [
  'Resumen de hoy',
  '¿Qué vence esta semana?',
  'Problemas abiertos',
  '¿Cómo va el lote LT-001?',
  '¿Qué me recomiendas?',
  '¿Qué insumos me faltan?',
];

function mensajeAyuda(intro: string): string {
  return [
    intro,
    '',
    'Puedo ayudarte con esto:',
    ...PREGUNTAS_EJEMPLO.map((p) => `• ${p}`),
  ].join('\n');
}

/** Minúsculas, sin acentos ni signos, espacios simples. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrae un código de lote tipo LT-001 de la pregunta (o null). */
function extraerCodigoLote(texto: string): string | null {
  const m = texto.match(/lt[\s-]?(\d+)/i);
  if (!m) return null;
  return `LT-${m[1].padStart(3, '0')}`;
}

function fechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function diasTexto(dias: number): string {
  if (dias < 0) return `vencida por ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'falta 1 día';
  return `faltan ${dias} días`;
}

async function cargarLotesAbiertos() {
  return prisma.loteProduccion.findMany({
    where: { estado: { in: ['PENDIENTE', 'EN_PRODUCCION'] } },
    include: {
      receta: { include: { recetaInsumos: { include: { insumo: true } } } },
      etapas: { orderBy: { orden: 'asc' } },
      notas: { include: { insumo: true }, orderBy: { createdAt: 'asc' } },
      productoTerminado: {
        include: {
          _count: { select: { ventas: true } },
          ventas: { select: { botellasVendidas: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function cargarLotePorCodigo(codigoLote: string) {
  return prisma.loteProduccion.findUnique({
    where: { codigoLote },
    include: {
      receta: { include: { recetaInsumos: { include: { insumo: true } } } },
      etapas: { orderBy: { orden: 'asc' } },
      notas: { include: { insumo: true }, orderBy: { createdAt: 'asc' } },
      productoTerminado: {
        include: {
          _count: { select: { ventas: true } },
          ventas: { select: { botellasVendidas: true } },
        },
      },
    },
  });
}

type LoteCompleto = Awaited<ReturnType<typeof cargarLotesAbiertos>>[number];

function aSeguimientoInput(lote: LoteCompleto): LoteSeguimientoInput {
  const ventas = lote.productoTerminado?._count.ventas ?? 0;
  const botellasVendidas = (lote.productoTerminado?.ventas ?? []).reduce(
    (sum, v) => sum + v.botellasVendidas,
    0
  );
  return {
    id: lote.id,
    codigoLote: lote.codigoLote,
    estado: lote.estado,
    recetaNombre: lote.receta.nombre,
    etapas: lote.etapas.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      orden: e.orden,
      estado: e.estado,
      fechaPlaneada: e.fechaPlaneada,
      fechaReal: e.fechaReal,
      fechaInicio: e.fechaInicio,
    })),
    notas: lote.notas.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      texto: n.texto,
      insumoId: n.insumoId,
      insumoNombre: n.insumo ? n.insumo.nombre : null,
      etapa: n.etapa,
      resuelto: n.resuelto,
      createdAt: n.createdAt,
    })),
    insumosReceta: lote.receta.recetaInsumos.map((ri) => ({
      insumoId: ri.insumo.id,
      nombre: ri.insumo.nombre,
      cantidadTeorica: Number(ri.cantidadConsumida),
      stockActual: Number(ri.insumo.stockActual),
      unidadMedida: ri.insumo.unidadMedida,
    })),
    botellasEnStock: lote.productoTerminado?.botellasEnStock ?? 0,
    ventasCount: ventas,
    botellasVendidas,
  };
}

/** Texto de estado de un lote con su seguimiento y recomendaciones. */
function textoEstadoLote(lote: LoteCompleto, hoy: Date): string {
  const seguimiento = calcularSeguimientoLote(aSeguimientoInput(lote), hoy);
  const lineas: string[] = [
    `Lote ${lote.codigoLote} · ${lote.receta.nombre}`,
    `Estado: ${lote.estado === 'PENDIENTE' ? 'Pendiente' : lote.estado === 'EN_PRODUCCION' ? 'En producción' : lote.estado === 'COMPLETADO' ? 'Completado' : 'Cancelado'} · Avance: ${seguimiento.etapasTotal === 0 ? 'sin etapas registradas' : `${seguimiento.etapasHechas}/${seguimiento.etapasTotal} etapas (${seguimiento.avancePorcentaje}%)`}`,
    `Cuenta regresiva: ${seguimiento.cuentaRegresivaLote.texto}${seguimiento.fechaEstimadaLista ? ` (estimado: ${fechaCorta(seguimiento.fechaEstimadaLista)})` : ''}`,
  ];

  if (seguimiento.etapasTotal > 0) {
    lineas.push('', 'Etapas:');
    for (const etapa of [...lote.etapas].sort((a, b) => a.orden - b.orden)) {
      lineas.push(`• ${etapa.nombre} — ${cuentaRegresivaEtapa(etapa, hoy).texto}`);
    }
  }

  if (seguimiento.problemasAbiertos.length > 0) {
    lineas.push('', `Problemas abiertos: ${seguimiento.problemasAbiertos.length}`);
    for (const p of seguimiento.problemasAbiertos) {
      const contexto = p.insumoNombre
        ? ` (insumo: ${p.insumoNombre})`
        : p.etapa
          ? ` (etapa: ${p.etapa})`
          : '';
      lineas.push(`• «${p.texto}»${contexto}`);
    }
  } else {
    lineas.push('', 'Problemas abiertos: ninguno.');
  }

  if (seguimiento.recomendaciones.length > 0) {
    lineas.push('', 'Recomendaciones:');
    for (const rec of seguimiento.recomendaciones) {
      lineas.push(`• ${rec.mensaje}`);
    }
  }
  return lineas.join('\n');
}

export type ResumenHoy = {
  /** Texto completo del resumen, para el primer mensaje del chat. */
  resumen: string;
  /** Máx. 3 líneas cortas, para la tarjeta del Dashboard. */
  lineas: string[];
};

/**
 * Resumen del día: etapas vencidas, por vencer en 3 días, problemas
 * abiertos, lotes listos, stock bajo y la recomendación más urgente.
 * Es el mismo motor que alimenta el chat y la tarjeta del Dashboard.
 */
export async function obtenerResumenHoy(): Promise<ResumenHoy> {
  const hoy = new Date();
  const sinDatos: ResumenHoy = {
    resumen: `Resumen de hoy, ${fechaLarga(hoy)}:\n\nAún no hay lotes registrados. Crea el primer lote en Producción y pregúntame por su seguimiento.`,
    lineas: ['Aún no hay lotes registrados.'],
  };
  if (!isDbConfigured()) {
    return {
      resumen: `Resumen de hoy, ${fechaLarga(hoy)}:\n\nAún no hay base de datos configurada, así que no tengo datos de lotes para consultar. Cuando la app tenga datos, pregúntame por vencimientos, problemas o recomendaciones.`,
      lineas: ['Sin base de datos configurada.'],
    };
  }

  try {
    const [seguimiento, stockBajo, lotesAbiertosCount] = await Promise.all([
      obtenerSeguimientoDashboard(),
      obtenerInsumosStockBajo(),
      prisma.loteProduccion.count({
        where: { estado: { in: ['PENDIENTE', 'EN_PRODUCCION'] } },
      }),
    ]);

    const lineasResumen: string[] = [`Resumen de hoy, ${fechaLarga(hoy)}:`];

    if (seguimiento.etapasVencidas.length > 0) {
      lineasResumen.push(
        '',
        `Etapas vencidas: ${seguimiento.etapasVencidas.length}`,
        ...seguimiento.etapasVencidas.slice(0, 3).map(
          (e) =>
            `• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — vencida por ${e.dias ?? '?'} día${(e.dias ?? 0) === 1 ? '' : 's'}.`
        )
      );
    }
    if (seguimiento.etapasPorVencer.length > 0) {
      lineasResumen.push(
        '',
        `Vencen en los próximos 3 días: ${seguimiento.etapasPorVencer.length}`,
        ...seguimiento.etapasPorVencer.slice(0, 3).map(
          (e) =>
            `• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — ${(e.dias ?? 0) === 0 ? 'vence hoy' : `faltan ${e.dias} días`}.`
        )
      );
    }
    if (seguimiento.problemasAbiertos.length > 0) {
      lineasResumen.push(
        '',
        `Problemas abiertos: ${seguimiento.problemasAbiertos.length}`,
        ...seguimiento.problemasAbiertos.slice(0, 3).map(
          (p) =>
            `• ${p.loteCodigo}: «${p.texto.length > 100 ? `${p.texto.slice(0, 100).trim()}…` : p.texto}»${p.insumoNombre ? ` (insumo: ${p.insumoNombre})` : ''}${p.etapa ? ` (etapa: ${p.etapa})` : ''}`
        )
      );
    }
    if (seguimiento.lotesListos.length > 0) {
      lineasResumen.push(
        '',
        `Lotes listos: ${seguimiento.lotesListos.length}`,
        ...seguimiento.lotesListos.slice(0, 3).map(
          (l) => `• ${l.codigoLote} (${l.recetaNombre}) — ${l.motivo}`
        )
      );
    }
    if (stockBajo.length > 0) {
      lineasResumen.push(
        '',
        `Stock bajo: ${stockBajo.length} insumo(s)`,
        ...stockBajo
          .slice(0, 3)
          .map((i) => `• ${i.nombre}: ${i.stockActual} / mín. ${i.stockMinimo} ${i.unidadMedida}.`)
      );
    }
    if (seguimiento.recomendacionesUrgentes.length > 0) {
      lineasResumen.push('', 'Lo más urgente:');
      for (const rec of seguimiento.recomendacionesUrgentes.slice(0, 2)) {
        lineasResumen.push(`• ${rec.loteCodigo}: ${rec.mensaje}`);
      }
    }

    const hayPendientes =
      seguimiento.etapasVencidas.length > 0 ||
      seguimiento.etapasPorVencer.length > 0 ||
      seguimiento.problemasAbiertos.length > 0 ||
      seguimiento.lotesListos.length > 0 ||
      stockBajo.length > 0;
    if (!hayPendientes) {
      lineasResumen.push(
        '',
        lotesAbiertosCount > 0
          ? `Todo en orden: no hay etapas vencidas, problemas abiertos ni lotes esperando. Tienes ${lotesAbiertosCount} lote(s) abierto(s).`
          : 'Todo en orden: no hay etapas vencidas, problemas abiertos ni lotes esperando.'
      );
    }
    if (
      hayPendientes &&
      seguimiento.etapasVencidas.length === 0 &&
      seguimiento.etapasPorVencer.length === 0 &&
      seguimiento.problemasAbiertos.length === 0 &&
      stockBajo.length === 0
    ) {
      lineasResumen.push('', 'Sin etapas vencidas ni problemas abiertos; el stock está en orden.');
    }

    // Tarjeta del Dashboard: máx. 3 líneas cortas, siempre explícitas.
    const lineasCortas: string[] = [];
    const sinPendientes =
      seguimiento.etapasVencidas.length === 0 &&
      seguimiento.etapasPorVencer.length === 0 &&
      seguimiento.problemasAbiertos.length === 0 &&
      seguimiento.lotesListos.length === 0 &&
      stockBajo.length === 0;
    if (sinPendientes) {
      lineasCortas.push('Todo en orden: sin pendientes de seguimiento hoy.');
    } else {
      const partesVencimientos: string[] = [];
      if (seguimiento.etapasVencidas.length > 0) {
        partesVencimientos.push(`${seguimiento.etapasVencidas.length} vencida(s)`);
      }
      if (seguimiento.etapasPorVencer.length > 0) {
        partesVencimientos.push(`${seguimiento.etapasPorVencer.length} vencen en 3 días`);
      }
      lineasCortas.push(
        partesVencimientos.length > 0
          ? `⏰ ${partesVencimientos.join(' · ')}`
          : '⏰ Sin etapas vencidas ni por vencer'
      );
      if (seguimiento.problemasAbiertos.length > 0 || seguimiento.lotesListos.length > 0) {
        const partes: string[] = [];
        if (seguimiento.problemasAbiertos.length > 0) {
          partes.push(`${seguimiento.problemasAbiertos.length} problema(s) abierto(s)`);
        }
        if (seguimiento.lotesListos.length > 0) {
          partes.push(`${seguimiento.lotesListos.length} lote(s) listo(s)`);
        }
        lineasCortas.push(`⚠ ${partes.join(' · ')}`);
      }
      lineasCortas.push(
        stockBajo.length > 0 ? `📦 ${stockBajo.length} insumo(s) en stock bajo` : '📦 Stock en orden'
      );
    }

    return { resumen: lineasResumen.join('\n'), lineas: lineasCortas.slice(0, 3) };
  } catch (error) {
    console.error('obtenerResumenHoy: sin acceso a la base de datos', error);
    return sinDatos;
  }
}

/**
 * Responde una pregunta del chat. Solo lectura: consulta el
 * seguimiento, las alertas de stock y las ventas, y arma el texto
 * con los datos reales. Devuelve el texto de la respuesta.
 */
export async function preguntarAsistente(pregunta: string): Promise<string> {
  const original = (pregunta ?? '').trim();
  if (!original) {
    return mensajeAyuda('Escribe tu pregunta, por ejemplo:');
  }
  if (!isDbConfigured()) {
    return 'Aún no hay base de datos configurada, así que no tengo datos de lotes para consultar. Cuando la app tenga datos, pregúntame por vencimientos, problemas o recomendaciones.';
  }

  const texto = normalizar(original);
  const codigoLote = extraerCodigoLote(original);
  const hoy = new Date();

  const contiene = (...palabras: string[]) => palabras.some((p) => texto.includes(p));

  try {
    // 1. Pregunta por un lote concreto (LT-001, LT-002…).
    if (codigoLote) {
      const lote = await cargarLotePorCodigo(codigoLote);
      if (!lote) {
        return `No encontré el lote ${codigoLote}. Revisa el código en Producción y pregúntame de nuevo, por ejemplo «¿Cómo va el lote LT-001?».`;
      }
      if (contiene('problema', 'incidencia', 'falla', 'fallo')) {
        const seg = calcularSeguimientoLote(aSeguimientoInput(lote), hoy);
        if (seg.problemasAbiertos.length === 0) {
          return `El lote ${codigoLote} no tiene problemas abiertos.`;
        }
        return [
          `Problemas abiertos del lote ${codigoLote}: ${seg.problemasAbiertos.length}`,
          ...seg.problemasAbiertos.map(
            (p) =>
              `• «${p.texto}»${p.insumoNombre ? ` (insumo: ${p.insumoNombre})` : ''}${p.etapa ? ` (etapa: ${p.etapa})` : ''}`
          ),
          '',
          'Puedes marcarlos como resueltos en Producción.',
        ].join('\n');
      }
      if (contiene('recomiend', 'consejo', 'que hago', 'que debo')) {
        const seg = calcularSeguimientoLote(aSeguimientoInput(lote), hoy);
        if (seg.recomendaciones.length === 0) {
          return `El lote ${codigoLote} no tiene recomendaciones pendientes: todo en orden.`;
        }
        return [
          `Recomendaciones para el lote ${codigoLote}:`,
          ...seg.recomendaciones.map((r) => `• ${r.mensaje}`),
        ].join('\n');
      }
      return textoEstadoLote(lote, hoy);
    }

    // 2. Resumen de hoy.
    if (contiene('resumen', 'hoy', 'que hay', 'que tengo', 'como va el dia', 'como va todo')) {
      return (await obtenerResumenHoy()).resumen;
    }

    // 3. Vencimientos: hoy, esta semana o vencidas.
    if (
      contiene('vence', 'vencimiento', 'vencida', 'vencido', 'vencidas', 'vencidos', 'esta semana', 'semana', 'atrasado', 'retrasado')
    ) {
      const proximas = await obtenerProximasEtapas();
      const vencidas = proximas.filter((e) => e.vencida);
      const vencenHoy = proximas.filter(
        (e) => !e.vencida && e.fechaPlaneada && diasHasta(e.fechaPlaneada, hoy) === 0
      );
      const proximasSemana = proximas.filter(
        (e) => !e.vencida && e.fechaPlaneada && diasHasta(e.fechaPlaneada, hoy) > 0
      );

      if (contiene('hoy')) {
        if (vencidas.length === 0 && vencenHoy.length === 0) {
          return 'Hoy no vence ninguna etapa y no hay etapas vencidas pendientes. Todo en orden.';
        }
        const lineas: string[] = ['Para hoy:'];
        for (const e of vencidas) {
          lineas.push(
            `• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — vencida por ${e.fechaPlaneada ? Math.abs(diasHasta(e.fechaPlaneada, hoy)) : '?'} día${e.fechaPlaneada && Math.abs(diasHasta(e.fechaPlaneada, hoy)) === 1 ? '' : 's'}.`
          );
        }
        for (const e of vencenHoy) {
          lineas.push(`• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — vence hoy.`);
        }
        return lineas.join('\n');
      }

      if (contiene('vencida', 'vencido', 'vencidas', 'vencidos', 'atrasado', 'retrasado')) {
        if (vencidas.length === 0) {
          return 'No hay etapas vencidas sin hacer. Todo en orden.';
        }
        return [
          `Etapas vencidas sin hacer: ${vencidas.length}`,
          ...vencidas.map(
            (e) =>
              `• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — vencida por ${e.fechaPlaneada ? Math.abs(diasHasta(e.fechaPlaneada, hoy)) : '?'} día${e.fechaPlaneada && Math.abs(diasHasta(e.fechaPlaneada, hoy)) === 1 ? '' : 's'}.`
          ),
        ].join('\n');
      }

      if (proximas.length === 0) {
        return 'No hay etapas que venzan esta semana. Si algún lote no tiene fechas planeadas, asígnalas en Producción para verlas aquí.';
      }
      const lineas: string[] = ['Lo que vence esta semana:'];
      for (const e of vencidas) {
        lineas.push(
          `• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — vencida por ${e.fechaPlaneada ? Math.abs(diasHasta(e.fechaPlaneada, hoy)) : '?'} día${e.fechaPlaneada && Math.abs(diasHasta(e.fechaPlaneada, hoy)) === 1 ? '' : 's'}.`
        );
      }
      for (const e of [...vencenHoy, ...proximasSemana]) {
        lineas.push(
          `• ${e.nombre} · ${e.loteCodigo} (${e.recetaNombre}) — ${e.fechaPlaneada ? diasTexto(diasHasta(e.fechaPlaneada, hoy)) : 'sin fecha'} (${e.fechaPlaneada ? fechaCorta(e.fechaPlaneada) : ''}).`
        );
      }
      return lineas.join('\n');
    }

    // 4. Problemas abiertos.
    if (contiene('problema', 'incidencia', 'falla', 'fallo', 'incidente')) {
      const seg = await obtenerSeguimientoDashboard();
      if (seg.problemasAbiertos.length === 0) {
        return 'No hay problemas abiertos en ningún lote. Todo en orden.';
      }
      return [
        `Problemas abiertos: ${seg.problemasAbiertos.length}`,
        ...seg.problemasAbiertos.map(
          (p) =>
            `• ${p.loteCodigo} (${p.recetaNombre}): «${p.texto}»${p.insumoNombre ? ` (insumo: ${p.insumoNombre})` : ''}${p.etapa ? ` (etapa: ${p.etapa})` : ''}`
        ),
        '',
        'Puedes marcarlos como resueltos en Producción.',
      ].join('\n');
    }

    // 5. Stock bajo y faltantes para los lotes.
    if (contiene('stock', 'insumo', 'falta', 'faltan', 'me falta', 'reponer', 'queda')) {
      const stockBajo = await obtenerInsumosStockBajo();
      const lotesAbiertos = await cargarLotesAbiertos();
      const faltantes: string[] = [];
      for (const lote of lotesAbiertos) {
        const seg = calcularSeguimientoLote(aSeguimientoInput(lote), hoy);
        for (const rec of seg.recomendaciones) {
          if (rec.mensaje.startsWith('Falta stock de')) {
            faltantes.push(`• ${lote.codigoLote}: ${rec.mensaje}`);
          }
        }
      }
      if (stockBajo.length === 0 && faltantes.length === 0) {
        return 'No hay insumos en stock bajo ni faltantes para los lotes abiertos. Todo en orden.';
      }
      const lineas: string[] = [];
      if (stockBajo.length > 0) {
        lineas.push(`Insumos en stock bajo: ${stockBajo.length}`);
        for (const i of stockBajo) {
          lineas.push(`• ${i.nombre}: ${i.stockActual} / mín. ${i.stockMinimo} ${i.unidadMedida}.`);
        }
      }
      if (faltantes.length > 0) {
        lineas.push('', 'Faltan para los lotes abiertos:');
        lineas.push(...faltantes);
      }
      return lineas.join('\n');
    }

    // 6. Recomendaciones generales.
    if (
      contiene('recomiend', 'consejo', 'que hago', 'que debo', 'sugerencia', 'que me sugieres', 'que sigue')
    ) {
      const seg = await obtenerSeguimientoDashboard();
      const lineas: string[] = [];
      if (seg.recomendacionesUrgentes.length > 0) {
        lineas.push('Recomendaciones urgentes:');
        for (const rec of seg.recomendacionesUrgentes) {
          lineas.push(`• ${rec.loteCodigo}: ${rec.mensaje}`);
        }
      }
      if (seg.lotesListos.length > 0) {
        lineas.push('', 'Lotes listos para el siguiente paso:');
        for (const l of seg.lotesListos) {
          lineas.push(`• ${l.codigoLote} (${l.recetaNombre}) — ${l.motivo}`);
        }
      }
      if (lineas.length === 0) {
        const lotesAbiertos = await cargarLotesAbiertos();
        if (lotesAbiertos.length === 0) {
          return 'No hay lotes abiertos: todo en orden. Si quieres, crea un lote en Producción y te ayudo a seguirlo.';
        }
        const proximas = lotesAbiertos
          .map((l) => calcularSeguimientoLote(aSeguimientoInput(l), hoy))
          .flatMap((s) => s.recomendaciones)
          .filter((r) => r.nivel !== 'urgente')
          .slice(0, 4);
        if (proximas.length === 0) {
          return 'Todo en orden: no hay recomendaciones pendientes.';
        }
        return ['Recomendaciones:', ...proximas.map((r) => `• ${r.mensaje}`)].join('\n');
      }
      return lineas.join('\n');
    }

    // 7. Ventas, clientes y pedidos.
    if (contiene('venta', 'vend', 'cliente', 'pedido', 'cobrar', 'ingreso')) {
      const [resumenVentas, pedidosPendientes, clientesActivos, ventasPendientesPago] =
        await Promise.all([
          obtenerResumenVentas(),
          prisma.pedido.count({ where: { estado: 'PENDIENTE' } }),
          prisma.cliente.count({ where: { activo: true } }),
          prisma.venta.count({ where: { estadoPago: 'PENDIENTE' } }),
        ]);
      const lineas: string[] = ['Ventas y pedidos:'];
      lineas.push(
        `• ${resumenVentas.ventasCount} venta(s) en total: ${resumenVentas.botellasVendidas} botellas vendidas, $${resumenVentas.ingresosTotales.toFixed(2)} de ingresos.`
      );
      lineas.push(
        `• Este mes: ${resumenVentas.ventasMes} botellas, $${resumenVentas.ingresosMes.toFixed(2)} de ingresos.`
      );
      if (ventasPendientesPago > 0) {
        lineas.push(`• ${ventasPendientesPago} venta(s) con pago pendiente de cobrar.`);
      }
      lineas.push(`• ${pedidosPendientes} pedido(s) pendiente(s) y ${clientesActivos} cliente(s) activo(s).`);
      return lineas.join('\n');
    }

    // 8. Botellas en stock.
    if (contiene('botella')) {
      const productos = await prisma.productoTerminado.findMany({
        include: { receta: true, loteProduccion: true },
        orderBy: { createdAt: 'desc' },
      });
      const total = productos.reduce((sum, p) => sum + p.botellasEnStock, 0);
      if (productos.length === 0) {
        return 'Aún no hay botellas en stock. Completa un lote en Producción para tener producto terminado.';
      }
      const lineas: string[] = [`Botellas en stock: ${total} en total.`];
      for (const p of productos.slice(0, 5)) {
        lineas.push(
          `• ${p.receta.nombre} · ${p.loteProduccion.codigoLote}: ${p.botellasEnStock} bot. ($${Number(p.costoUnitarioBotella).toFixed(2)} c/u).`
        );
      }
      return lineas.join('\n');
    }

    // 9. Lotes abiertos en general. Si pregunta cómo va "el lote"
    // sin dar código, responde con el lote abierto más reciente.
    if (contiene('lote', 'lotes', 'produccion', 'produciendo', 'ferment')) {
      const lotesAbiertos = await cargarLotesAbiertos();
      if (lotesAbiertos.length === 0) {
        return 'No hay lotes abiertos. Si quieres saber de uno en concreto, pregúntame por su código, por ejemplo «¿Cómo va el lote LT-001?».';
      }
      if (contiene('como va', 'cómo va', 'como esta', 'cómo está', 'estado del lote')) {
        const masReciente = lotesAbiertos[0];
        return [
          textoEstadoLote(masReciente, hoy),
          '',
          'Es el lote abierto más reciente. Para ver otro, dime su código, por ejemplo «¿Cómo va el lote LT-001?».',
        ].join('\n');
      }
      const lineas: string[] = [`Lotes abiertos: ${lotesAbiertos.length}`];
      for (const lote of lotesAbiertos.slice(0, 5)) {
        const seg = calcularSeguimientoLote(aSeguimientoInput(lote), hoy);
        lineas.push(
          `• ${lote.codigoLote} · ${lote.receta.nombre} — ${seg.etapasTotal === 0 ? 'sin etapas registradas' : `${seg.avancePorcentaje}% (${seg.etapasHechas}/${seg.etapasTotal} etapas)`}, ${seg.cuentaRegresivaLote.texto}.`
        );
      }
      lineas.push('', 'Para el detalle de uno, dime su código, por ejemplo «¿Cómo va el lote LT-001?».');
      return lineas.join('\n');
    }

    // 10. Saludo / qué puede hacer.
    if (contiene('hola', 'buenas', 'que puedes', 'ayuda', 'que sabes', 'quien eres')) {
      return mensajeAyuda(
        'Hola, soy el asistente de MELMIR. Te ayudo con el seguimiento de tus lotes usando los datos reales de la app.'
      );
    }

    return mensajeAyuda('No entendí tu pregunta. Prueba con una de estas:');
  } catch (error) {
    console.error('preguntarAsistente: sin acceso a la base de datos', error);
    return 'No pude consultar los datos ahora. Inténtalo de nuevo en un momento.';
  }
}
