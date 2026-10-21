import { prisma } from '@/lib/prisma';
import { calculateRecipeCost } from '@/app/lib/costeo';

export async function obtenerRecetaCosto(recetaId: string) {
  return calculateRecipeCost(recetaId);
}

export async function obtenerListadoRecetasConCosto() {
  const recetas = await prisma.receta.findMany({
    include: {
      recetaInsumos: {
        include: {
          insumo: true,
        },
      },
    },
  });

  const items = await Promise.all(
    recetas.map(async (receta) => {
      const costo = await calculateRecipeCost(receta.id);
      return {
        ...receta,
        costoLote: costo.costoLote,
        costoPorPieza: costo.costoPorPieza,
      };
    })
  );

  return items;
}
