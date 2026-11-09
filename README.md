# MELMIR ERP

Sistema ERP para gestión de hidromiel con Next.js, Prisma y PostgreSQL.

## Stack tecnológico
- Next.js 14 App Router
- React + TypeScript
- Tailwind CSS
- Prisma ORM 5
- PostgreSQL (NeonTech)
- Vercel

## Requisitos
- Node.js 20+ (ver `.nvmrc`)
- Cuenta en Vercel
- Base de datos PostgreSQL en NeonTech

## Configuración local

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Crea tu `.env`:
   ```bash
   cp .env.example .env
   ```

3. Configura la variable `DATABASE_URL` con tu conexión de NeonTech.

4. Genera Prisma y sincroniza el esquema (una sola vez, con la base accesible):
   ```bash
   npm run db:setup
   npm run seed
   ```

5. Inicia el proyecto:
   ```bash
   npm run dev
   ```

## Despliegue en Vercel

- Conecta este repositorio a Vercel (el proyecto ya existe como `melmir`).
- Define la variable de entorno `DATABASE_URL` en **Production, Preview y
  Development**. Sin ella, la app despliega y arranca, pero muestra estados
  vacíos con el aviso "Configura DATABASE_URL en Vercel para ver tus datos
  reales".
- El build (`npm run build` y `vercel-build`) es solo
  `prisma generate && next build`: **ya no hace `prisma db push` durante el
  build**, porque eso hacía fallar el despliegue cuando la base no estaba
  accesible. La sincronización del esquema se hace una sola vez con
  `npm run db:setup` y los datos iniciales con `npm run seed`.
- Haz push a `main` para disparar el despliegue automático.

## Módulos incluidos
- Inventario de insumos (tabla real, altas y movimientos de stock)
- Gestión de recetas (costeo por lote y por pieza, agregar insumos a la receta)
- Costeo automático por lote y por pieza
- Producción y cierre de lotes (completar lote con validación de stock)
- Producto terminado y stock
- Precios sugeridos por receta (IEPS 8%, IVA 16%, margen 30%)
- Historial de movimientos y lotes
- Dashboard ejecutivo con alertas de stock bajo

## Mejoras de esta actualización
- Build a prueba de base de datos: todas las páginas usan
  `export const dynamic = 'force-dynamic'` y las consultas Prisma están
  protegidas con `try/catch` e `isDbConfigured()`; sin `DATABASE_URL` la app
  muestra estados vacíos y un aviso, sin error 500.
- `app/insumos` ya no es una copia del home: tabla real con alerta de stock
  bajo, formulario para crear insumos y formulario para registrar movimientos
  (compra, ajustes, merma y consumo de producción).
- `app/precios` ya no es una copia de producción: lista de recetas con costo
  de lote, costo por pieza y precio sugerido, más productos terminados en
  stock con su costo unitario.
- `app/historial` vuelve a tener `export default`: movimientos de insumos
  (últimos 50) y lotes recientes (últimos 20).
- `app/dashboard` es distinto del home: KPIs, alertas de stock bajo, lotes
  pendientes/en producción y producto terminado en stock.
- Botones muertos eliminados: "Completar lote" ahora cierra el lote de verdad
  (`completarLoteForm`), "Ver detalle" es un enlace al historial, y
  "Duplicar receta" / "Editar" se quitaron hasta implementarlos de verdad.
- `completarLoteProduccion` rechaza el cierre si algún insumo quedaría con
  stock negativo ("Stock insuficiente de <nombre>").
- `crearInsumo` valida código, nombre y categoría no vacíos y montos >= 0, y
  reporta el código duplicado con un mensaje claro.
- `agregarInsumoAReceta` permite agregar insumos a una receta desde su
  tarjeta, con validación y sin duplicados (upsert).
- El seed crea el `ProductoTerminado` del lote LT-001 (118 botellas, costo
  real 1248.3, $10.4 por botella).
- Navegación móvil visible en pantallas pequeñas y enlace a `/dashboard` en
  el menú. Páginas `app/error.tsx` y `app/not-found.tsx` en español.

## Estructura principal
- `app/` páginas y listas principales
- `app/actions/` server actions
- `app/lib/` lógica de negocio y cálculo
- `prisma/` esquema y seed
- `components/` UI reutilizable

## Nota
Antes del despliegue final, debes configurar la variable `DATABASE_URL` de tu
base NeonTech para que Prisma se conecte correctamente.
