# MELMIR ERP

ERP para producción, costos y ventas de hidromiel.

## Stack
- Next.js App Router
- Prisma ORM
- PostgreSQL (NeonTech)
- Tailwind CSS
- Vercel

## Variables de entorno

1. Crea tu archivo .env a partir de .env.example
2. Configura `DATABASE_URL` con tu cadena de conexión de NeonTech

```bash
cp .env.example .env
```

## Instalación local

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Despliegue en Vercel

- Conecta este repositorio a Vercel
- En Variables de entorno agrega:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET` (opcional si no usas auth)
- Haz deploy

## Estructura principal

- `app/` - páginas y server actions
- `components/` - componentes compartidos
- `lib/` - helper de Prisma y utilidades
- `prisma/` - schema y seed
