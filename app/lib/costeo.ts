import { prisma } from '@/lib/prisma';

export type RecipeCostBreakdown = {
  recipeId: string;
  recipeName: string;
  costoLote: number;
  costoPorPieza: number;
  rendimientoBotellas: number;
  detalle: Array<{
    insumoId: string;
    insumoNombre: string;
    categoria: string;
    unidadMedida: string;
    cantidadConsumida: number;
    costoUnitario: number;
    subtotal: number;
  }>;
};

export async function calculateRecipeCost(recetaId: string): Promise<RecipeCostBreakdown> {
  const receta = await prisma.receta.findUnique({
    where: { id: recetaId },
    include: {
      recetaInsumos: {
        include: {
          insumo: true,
        },
      },
    },
  });

  if (!receta) {
    throw new Error(`Receta no encontrada: ${recetaId}`);
  }

  const detalle = receta.recetaInsumos.map((ri) => {
    const cantidad = Number(ri.cantidadConsumida);
    const costoUnitario = Number(ri.insumo.costoUnitario);

    return {
      insumoId: ri.insumo.id,
      insumoNombre: ri.insumo.nombre,
      categoria: ri.insumo.categoria,
      unidadMedida: ri.insumo.unidadMedida,
      cantidadConsumida: cantidad,
      costoUnitario,
      subtotal: cantidad * costoUnitario,
    };
  });

  const costoLote = detalle.reduce((sum, item) => sum + item.subtotal, 0);
  const rendimientoBotellas = Number(receta.rendimientoBotellas);
  const costoPorPieza = rendimientoBotellas > 0 ? costoLote / rendimientoBotellas : 0;

  return {
    recipeId: receta.id,
    recipeName: receta.nombre,
    costoLote,
    costoPorPieza,
    rendimientoBotellas,
    detalle,
  };
}
