# MELMIR ERP

Sistema ERP para gestión de hidromiel con Next.js, Prisma y PostgreSQL.

## Stack tecnológico
- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (NeonTech)
- Vercel

## Requisitos
- Node.js 18+
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

4. Genera Prisma y sincroniza esquema:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

5. Inicia el proyecto:
   ```bash
   npm run dev
   ```

## Despliegue en Vercel

- Conecta este repositorio a Vercel
- Define la variable de entorno `DATABASE_URL`
- Selecciona el framework `Next.js`
- Haz deploy

## Módulos incluidos
- Inventario de insumos
- Gestión de recetas
- Costeo auto por lote y por pieza
- Producción y cierre de lotes
- Producto terminado y stock
- Pricing sugerido por receta

## Estructura principal
- `app/` páginas y listas principales
- `app/actions/` server actions
- `app/lib/` lógica de negocio y cálculo
- `prisma/` esquema y seed
- `components/` UI reutilizable

## Nota
Antes del despliegue final, debes configurar la variable `DATABASE_URL` de tu base NeonTech para que Prisma se conecte correctamente.
