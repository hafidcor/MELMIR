import { PrismaClient, UnidadMedida } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const insumos = [
    {
      codigo: 'MEL-001',
      nombre: 'Miel de agave',
      categoria: 'Azúcar',
      unidadMedida: UnidadMedida.KG,
      costoUnitario: 35,
      stockActual: 140,
      stockMinimo: 50,
    },
    {
      codigo: 'LEV-001',
      nombre: 'Levadura ale',
      categoria: 'Fermento',
      unidadMedida: UnidadMedida.G,
      costoUnitario: 0.8,
      stockActual: 2500,
      stockMinimo: 500,
    },
    {
      codigo: 'AGUA-001',
      nombre: 'Agua tratada',
      categoria: 'Base',
      unidadMedida: UnidadMedida.L,
      costoUnitario: 4.5,
      stockActual: 200,
      stockMinimo: 50,
    },
    {
      codigo: 'LIM-001',
      nombre: 'Limón',
      categoria: 'Cítrico',
      unidadMedida: UnidadMedida.KG,
      costoUnitario: 18,
      stockActual: 25,
      stockMinimo: 10,
    },
  ];

  for (const insumo of insumos) {
    await prisma.insumo.upsert({
      where: { codigo: insumo.codigo },
      update: insumo,
      create: insumo,
    });
  }

  const recetaExistente = await prisma.receta.findFirst({
    where: { nombre: 'Hidromiel Clásica' },
  });

  if (!recetaExistente) {
    const receta = await prisma.receta.create({
      data: {
        nombre: 'Hidromiel Clásica',
        estilo: 'Semi Seco',
        abv: 6.5,
        volumenLoteEstimado: 60,
        rendimientoBotellas: 120,
      },
    });

    const miel = await prisma.insumo.findUnique({ where: { codigo: 'MEL-001' } });
    const levadura = await prisma.insumo.findUnique({ where: { codigo: 'LEV-001' } });
    const agua = await prisma.insumo.findUnique({ where: { codigo: 'AGUA-001' } });

    if (miel && levadura && agua) {
      await prisma.recetaInsumo.createMany({
        data: [
          { recetaId: receta.id, insumoId: miel.id, cantidadConsumida: 12 },
          { recetaId: receta.id, insumoId: levadura.id, cantidadConsumida: 25 },
          { recetaId: receta.id, insumoId: agua.id, cantidadConsumida: 45 },
        ],
      });
    }
  }

  const loteExistente = await prisma.loteProduccion.findFirst({
    where: { codigoLote: 'LT-001' },
  });

  if (!loteExistente) {
    const receta = await prisma.receta.findFirst({ where: { nombre: 'Hidromiel Clásica' } });

    if (receta) {
      await prisma.loteProduccion.create({
        data: {
          codigoLote: 'LT-001',
          recetaId: receta.id,
          botellasEsperadas: 120,
          botellasReales: 118,
          estado: 'COMPLETADO',
          costoTotalLote: 1248.3,
          costoUnitarioPieza: 10.4,
          fechaProduccion: new Date(),
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
