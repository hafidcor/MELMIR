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
- El build (`npm run build` y `vercel-build`) es `scripts/vercel-build.sh`:
  `prisma generate`; si hay `DATABASE_URL`, hace `prisma db push
  --accept-data-loss` y `npx tsx prisma/seed.ts` (ambos con tolerancia a
  fallos, el build continúa aunque fallen) y luego `next build`. Sin
  `DATABASE_URL` el build solo genera el cliente y compila, y la app
  muestra estados vacíos con el aviso "Configura DATABASE_URL en Vercel
  para ver tus datos reales". Cada despliegue con base de datos sincroniza
  el esquema, así que las tablas nuevas (por ejemplo `archivos`) se crean
  solas al desplegar.
- Haz push a `main` para disparar el despliegue automático.

## Archivos en Cloudflare R2 (plan gratis)

MELMIR guarda imágenes y archivos en **Cloudflare R2** (API S3-compatible):
fotos de recetas, fotos y documentos de lotes, fichas y certificados de
insumos, y facturas o comprobantes de ventas. Todo se gestiona desde la app:
cada receta, lote, insumo y venta tiene su sección de archivos (subir,
abrir/descargar y eliminar), y `/archivos` lista todos los archivos con
filtro por entidad. Los metadatos quedan en la base de datos (modelo
Prisma `Archivo`: nombre original, clave en R2, URL pública, tipo MIME,
tamaño, entidad y entidadId); el contenido vive en R2.

### Configuración en Cloudflare (una sola vez)

1. En el panel de Cloudflare, ve a **R2 Object Storage > Create bucket** y
   crea un bucket, por ejemplo `melmir-archivos`. Anota su nombre.
2. En **R2 > Manage R2 API Tokens > Create API Token**, crea un token con
   permiso **Object Read & Write** sobre ese bucket. Anota el **Access Key
   ID**, el **Secret Access Key** y el **Account ID** (aparece en la URL del
   panel de R2 o en la página del bucket). El secreto solo se muestra una
   vez: guárdalo en un lugar seguro, nunca en el repo.
3. Activa el acceso público de lectura: en el bucket, **Settings > Public
   access**, permite el acceso público (o conecta un dominio propio en
   **Custom Domains**) y anota la **URL pública** (dominio `r2.dev` del
   bucket, del tipo `https://pub-xxxxxxxxxxxxxxxx.r2.dev`, o tu dominio
   propio). Sin URL pública, los enlaces de descarga no abrirán el archivo.
   Alternativa sin acceso público: usar URLs firmadas (no implementado;
   la app usa la URL pública).

### Variables en Vercel

En el proyecto `melmir`, **Settings > Environment Variables**, para
**Production, Preview y Development**:

| Variable | Valor |
| --- | --- |
| `R2_ACCOUNT_ID` | Account ID de Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key ID del token R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key del token (marcar como **Secret**) |
| `R2_BUCKET_NAME` | Nombre del bucket, p. ej. `melmir-archivos` |
| `R2_PUBLIC_URL` | URL pública del bucket, p. ej. `https://pub-xxxxxxxxxxxxxxxx.r2.dev` |

Después de guardarlas, haz un redespliegue para que tomen efecto. En
local, copia `.env.example` a `.env` y rellena los mismos valores.

Sin estas variables la app sigue funcionando: las páginas muestran el
aviso "Configura Cloudflare R2 en Vercel para subir archivos" y la subida
queda desactivada (mismo patrón que `DATABASE_URL`).

### Reglas de subida

- Solo imágenes (JPEG, PNG, WebP, GIF) y PDF.
- Máximo **5 MB por archivo** (también limitado en `next.config.mjs` con
  `serverActions.bodySizeLimit: '5mb'`).
- La validación se hace en el servidor (`app/actions/archivos.ts`).
- Al eliminar un archivo se borra el objeto de R2 y su registro en la
  base de datos.
- Las claves en R2 tienen el formato
  `melmir/<entidad>/<entidadId>/<fecha>-<aleatorio>-<nombre>`.

### Límites del plan gratis de R2

- **10 GB** de almacenamiento incluidos al mes.
- **1 millón de operaciones de escritura (Clase A)** y **10 millones de
  lecturas (Clase B)** al mes.
- **Sin cargos por salida (egress)**: descargar los archivos no cuesta.
- Pasados los límites se cobra por uso (ver precios actuales en
  cloudflare.com); para el volumen de MELMIR el plan gratis es suficiente.
- R2 no es Cloudflare Images: no hay transformaciones ni redimensionado
  automático de imágenes; la app sirve el archivo original tal cual se
  subió.

## Módulos incluidos
- Inventario de insumos (tabla real, altas y movimientos de stock)
- Gestión de recetas (costeo por lote y por pieza, agregar insumos a la receta,
  descripción opcional con foto principal, edición completa de la receta)
- Costeo automático por lote y por pieza
- Producción y cierre de lotes (completar lote con validación de stock)
- Producto terminado y stock
- Precios sugeridos por receta (IEPS 8%, IVA 16%, margen 30%)
- Ventas de producto terminado (registro de ventas con descuento de stock, precio sugerido y totales)
- Archivos en Cloudflare R2: fotos y documentos de recetas, lotes, insumos y ventas, con listado general en `/archivos`
- Historial de movimientos, ventas y lotes
- Exportación a CSV del inventario y de los movimientos
- Búsqueda y filtros en Insumos, Historial y Producción
- Dashboard ejecutivo con alertas de stock bajo y resumen de ventas

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

## Novedades: archivos en Cloudflare R2
- **R2 de propósito general (modelo Prisma `Archivo`, `lib/r2.ts`,
  `app/actions/archivos.ts`, `components/archivos.tsx`)**: sube imágenes
  (JPEG, PNG, WebP, GIF) y PDF de hasta 5 MB a un bucket R2 con el cliente
  S3 de AWS (`@aws-sdk/client-s3`). Sirve para recetas, lotes, insumos y
  ventas: cada receta muestra su primera imagen como foto principal y su
  sección de archivos; cada lote tiene su sección de archivos; cada insumo
  la tiene dentro de su editor; cada venta puede recibir archivos desde
  `/ventas`. La página `/archivos` lista todos los archivos con filtro por
  entidad, enlace para abrir/descargar y eliminación (borra de R2 y de la
  base). Sin las variables `R2_*` configuradas, las páginas muestran el
  aviso "Configura Cloudflare R2 en Vercel para subir archivos" y la
  subida queda desactivada, sin romper el build ni las páginas. El
  despliegue en Vercel crea la tabla `archivos` solo con `db push`.
- **Variables**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` y `R2_PUBLIC_URL` (ver
  `.env.example` y la sección "Archivos en Cloudflare R2" de este README).
  Configurado en 2026-11-09: bucket `melmir-archivos` con acceso público
  r2.dev y las 5 variables en Vercel; la subida ya funciona en producción.

## Novedades: ventas, edición de insumos, búsqueda, CSV y dashboard de ventas
- **Ventas (`/ventas`, modelo Prisma `Venta`)**: cierra el ciclo del ERP.
  Formulario para registrar una venta eligiendo un lote con stock mayor que 0,
  con el precio sugerido de Precios como valor por defecto si se deja vacío
  (costo + IEPS 8% + IVA 16% + margen 30%). Valida cantidad entera mayor que
  0, precio mayor o igual que 0 y stock suficiente; al vender descuenta las
  botellas del `ProductoTerminado` en la misma transacción. Tabla de ventas
  con totales y resumen (botellas vendidas, ingresos, número de ventas).
  Las ventas también aparecen en el Historial y en el Dashboard.
- **Editar y borrar insumos (`/insumos`)**: cada insumo se puede editar (nombre,
  código único, unidad, categoría, costo unitario y stock mínimo) desde un
  formulario desplegable; el stock actual no se edita, solo cambia con
  movimientos. Al guardar aparece una confirmación y se vuelve a la lista.
  Botón **Eliminar** con confirmación en dos pasos: solo ADMIN y OPERADOR
  pueden borrar, y solo si el insumo no está en ninguna receta, no tiene
  movimientos ni archivos; si los tiene, el borrado se rechaza explicando
  dónde está usado y la alternativa es desactivarlo. Botón para
  desactivar/reactivar. Los insumos inactivos se ven atenuados con la
  etiqueta «Inactivo» y no aparecen en los formularios de movimientos ni de
  recetas.
- **Búsqueda y filtros (sin librerías nuevas, con `searchParams`)**:
  buscador por nombre o código en `/insumos`, buscador por insumo o
  referencia en `/historial`, y filtro por estado (PENDIENTE / EN_PRODUCCION /
  COMPLETADO / CANCELADO) en `/produccion`.
- **Exportar a CSV**: botones en `/insumos` (`/api/insumos/csv`, inventario)
  y en `/historial` (`/api/historial/csv`, últimos 500 movimientos). Los
  Route Handlers usan `export const dynamic = 'force-dynamic'` y sin base
  de datos devuelven solo los encabezados, sin romper el build.
- **Dashboard mejorado**: mantiene los KPIs actuales y añade resumen de
  ventas (botellas vendidas, ingresos totales y ventas del mes), gráfico de
  barras en CSS puro con las ventas por mes de los últimos 6 meses y una
  lista de ventas recientes.

## Novedades: tema oscuro, menú, gráficas, usuarios y respaldos

- **Tema oscuro y dinámico**: interruptor claro/oscuro siempre visible en el
  menú (sol/luna), guardado en `localStorage` (`melmir-tema`) y que respeta
  `prefers-color-scheme` la primera vez; un script anti-parpadeo en
  `app/layout.tsx` pone la clase `dark` antes de pintar. `tailwind.config.ts`
  ya usaba `darkMode: ['class']` y `app/globals.css` tiene el bloque `.dark`
  con las variables de color; todas las páginas usan variantes `dark:`.
- **Menú mejorado (`components/navegacion.tsx`)**: en escritorio, barra
  superior con todos los enlaces y estado activo visible; en móvil, barra
  inferior fija con Inicio, Producción, Ventas, Archivos y Menú, más un menú
  deslizable con todas las secciones (Inicio, Dashboard, Insumos, Recetas,
  Producción, Precios, Ventas, Archivos, Historial, Usuarios, Respaldos).
  Muestra el usuario en sesión y el botón de cierre de sesión. El contenido
  tiene espacio inferior en móvil para que la barra no tape nada.
- **Gráficas reales en el Dashboard (`components/graficas.tsx`, SVG propio
  sin dependencias nuevas)**: ventas por mes (barras de botellas + línea de
  ingresos), stock de cada insumo frente a su stock mínimo (en rojo lo que
  está en el mínimo o por debajo) y dona de lotes por estado. Se ven bien en
  móvil y en tema oscuro.
- **Búsqueda en Ventas**: buscador por cliente, receta o lote en el historial
  de ventas (`/ventas?q=...`). **Alerta de stock bajo en Inicio**: si algún
  insumo está en el mínimo o por debajo, aparece un aviso rojo arriba con
  enlace a Insumos.
- **Usuarios y permisos (modelo Prisma `Usuario`, `lib/auth.ts`,
  `middleware.ts`, `/login`, `/usuarios`)**: roles ADMIN, OPERADOR, VENDEDOR
  y CONSULTA. CONSULTA solo lectura (todas las mutaciones se bloquean en el
  servidor); VENDEDOR registra ventas y sube archivos; OPERADOR gestiona
  insumos, producción y recetas; ADMIN todo más usuarios y respaldos. Sesión
  con cookie httpOnly JWT (HS256, 7 días) firmada con `jose` y contraseñas
  con `bcryptjs`. **Regla clave**: si la base de datos no tiene ningún
  usuario, la app funciona abierta como siempre (sin login); el login solo se
  exige cuando ya existe al menos un usuario. El primer usuario se crea en
  `/usuarios` (queda como ADMIN) y a partir de ahí hay que iniciar sesión.
- **Variable obligatoria antes del primer usuario**: `MELMIR_AUTH_SECRET`
  (ver `.env.example`; genera uno con `openssl rand -base64 32` y ponlo en
  Vercel como Secret para Production, Preview y Development). Sin ella no se
  puede iniciar sesión ni crear usuarios.
- **Respaldo de la base de datos en R2 (`/respaldo`, solo ADMIN)**: el botón
  "Crear respaldo" lee todas las tablas con Prisma, las serializa a JSON y
  lo sube a R2 con la clave `melmir/respaldos/YYYY-MM-DD-HHmm-respaldo.json`.
  La página lista los respaldos (fecha y tamaño) con descarga y borrado. Los
  respaldos NO son públicos: la descarga pasa por
  `/api/respaldos/[...clave]`, que hace streaming desde R2 solo para ADMIN.
  El respaldo NUNCA incluye `Usuario.contrasenaHash` ni secretos. La
  restauración es manual: se descarga el JSON y se reimporta a mano.

## Novedades: edición completa de insumos, borrado y descripción de recetas

- **Editar insumos (`/insumos`)**: el formulario desplegable ahora permite
  editar nombre, código (único), unidad, categoría, costo unitario y stock
  mínimo, con validación en el servidor. El stock actual sigue sin
  editarse: solo cambia con movimientos. Al guardar, la página vuelve a la
  lista con una confirmación verde.
- **Borrar insumos (`/insumos`, solo ADMIN y OPERADOR)**: botón «Eliminar»
  por insumo con confirmación en dos pasos (primero se abre un aviso y
  luego se confirma). El borrado se rechaza si el insumo está en alguna
  receta, tiene movimientos de inventario o archivos guardados, explicando
  dónde está usado; en esos casos la alternativa es «Desactivar». Sin
  referencias se borra de verdad (hard delete).
- **Descripción y fotos de recetas (`/recetas`, modelo `Receta.descripcion`
  opcional)**: cada hidromiel puede llevar una descripción (hasta 2000
  caracteres) en el formulario de crear y en el de editar. Se muestra en la
  tarjeta de la receta junto a su foto principal, que ahora se ve más
  grande; la foto principal es la primera imagen subida.
- **Insumos inactivos**: ya no aparecen como opción al agregar insumos a
  recetas nuevas (en movimientos ya se filtraban) y el servidor también lo
  rechaza si se intenta por la fuerza.

## Novedades: alertas de stock, margen, clientes, pedidos, etapas, POS, QR y PWA

- **Alertas de stock bajo**: el Dashboard muestra un banner rojo cuando hay
  insumos en o por debajo de su mínimo, y el menú lleva un contador rojo en
  «Insumos». Las alertas viven dentro de la app (sin correo ni SMS).
- **Costo real y margen por botella**: cada lote muestra su costo por botella
  calculado con los insumos consumidos (cantidad × costo unitario); si no hay
  consumo registrado se muestra «sin datos de costo» en vez de inventar un
  número. En Ventas y en el Dashboard se ve el margen por venta (precio −
  costo) y el margen del mes y total; las ventas sin costo no se incluyen en
  el margen y se cuentan aparte.
- **Clientes y cuentas por cobrar (`/clientes`, modelo `Cliente`)**: las
  ventas se asocian a un cliente y llevan estado de pago (PAGADO o
  PENDIENTE) con monto pagado y saldo pendiente. En Clientes se ve el saldo
  de cada uno y se registran abonos (modelo `Abono`); al cubrir el saldo la
  venta pasa a PAGADO. Las ventas viejas quedaron como PAGADO y sin cliente.
- **Pedidos anticipados (`/pedidos`, modelo `Pedido`)**: cliente opcional,
  hidromiel, cantidad de botellas, estado PENDIENTE / COMPLETADO /
  CANCELADO, fecha de entrega y notas. Las botellas de pedidos pendientes se
  muestran como «apartadas» junto al stock y no se descuentan hasta que el
  pedido se convierte en venta (descuenta stock con la lógica de ventas) o
  se cancela.
- **Etapas de producción (`/produccion`, modelo `LoteEtapa`)**: cada lote
  lleva Fermentación, Trasiego, Clarificación y Embotellado, con fecha
  planeada, fecha real y estado (pendiente / en curso / hecha). El Dashboard
  muestra las etapas vencidas y las que vencen en los próximos 7 días. Los
  lotes nuevos crean sus etapas solos; los viejos tienen un botón para
  agregarlas.
- **Punto de venta rápido (`/pos`)**: pensado para ferias desde el teléfono:
  elegir hidromiel, cantidad con botones +/−, total a la vista y registrar
  la venta en un toque, reutilizando la lógica de ventas (descuento de stock
  en transacción, cliente opcional, pago pagado o pendiente). No cobra con
  tarjeta: solo registra la venta.
- **Códigos QR en etiquetas**: ficha pública sin login en
  `/hidromiel/[id]` (nombre, descripción, foto principal, estilo, ABV y
  lotes; sin costos ni datos internos). El QR de esa URL se muestra en el
  detalle de la receta y del lote, y la ficha incluye una vista de etiqueta
  imprimible (nombre, lote, fecha y QR).
- **PWA instalable**: `public/manifest.webmanifest` (nombre MELMIR,
  theme-color verde esmeralda) e iconos 192/512 y apple-touch-icon
  generados en el repo. Se puede instalar como app en el teléfono. Sin modo
  offline en este lote.

## Novedades: costo real por lote ligado a su consumo

El costo es variable según la inversión de cada lote, así que ya no se
calcula con la fórmula teórica de la receta:

- **Consumo real al completar el lote (`/produccion`)**: el formulario de
  cierre muestra cada insumo de la receta con su cantidad teórica
  prellenada y un campo editable de cantidad REAL consumida. Al completar,
  el stock se valida y se descuenta con las cantidades reales (no las
  teóricas) y cada consumo queda ligado al lote
  (`InsumoMovimiento.loteProduccionId`, modelo nuevo en el esquema).
- **Costo real del lote** = Σ (cantidad real × costo unitario del insumo
  en ese momento) + costos adicionales. Se guarda en el lote
  (`costoTotalLote`, `costoUnitarioPieza` por botella real producida) y en
  el producto terminado (`costoRealLote`, `costoUnitarioBotella`). Si lo
  real es igual a la receta, el resultado coincide con el teórico.
- **Costos adicionales de producción** (modelo `CostoAdicionalLote`):
  gas, mano de obra, flete u otros gastos del lote, capturados en el mismo
  formulario de cierre y sumados al costo total del lote.
- **Desglose por lote**: en `/produccion`, cada lote completado muestra su
  «Costo real del lote» con el detalle (insumo, cantidad real, costo
  unitario, subtotal) leído de sus movimientos ligados, más los costos
  adicionales. El total se ve en vivo en el formulario antes de confirmar.
- **Costo teórico vs. real**: `/precios` sigue mostrando el costo teórico
  de la receta como referencia, ahora etiquetado «Costo teórico (receta)»;
  el costo real vive en el lote y en el producto terminado.
- **Margen y punto de venta usan el costo real**: el margen de ventas y el
  precio sugerido del POS se calculan con el costo unitario real del lote
  del que sale cada botella (ya era así; se verificó y no hizo falta
  corregir nada).
- **LT-001 no se tocó**: su costo guardado ($1,248.30 / $10.40 por
  botella) queda como su inversión real registrada; el seed no cambió. Su
  desglose no muestra movimientos porque se registró antes del consumo
  ligado al lote.

## Estructura principal
- `app/` páginas y listas principales
- `app/actions/` server actions
- `app/lib/` lógica de negocio y cálculo
- `prisma/` esquema y seed
- `components/` UI reutilizable

## Nota
Antes del despliegue final, debes configurar la variable `DATABASE_URL` de tu
base NeonTech para que Prisma se conecte correctamente.
