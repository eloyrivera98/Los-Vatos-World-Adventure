# Los Vatos World Adventure

MVP visual y navegable de una aplicación privada para registrar y descubrir pegatinas viajeras mediante proximidad GPS. La interfaz incluye mapa, ficha de pegatina, flujo común de escaneo, actividad, estadísticas y perfil.

## Inicio rápido

```bash
npm install
npm run dev
```

Para crear la versión de producción:

```bash
npm run build
npm run preview
```

## Arquitectura propuesta

- **Cliente:** React, TypeScript y Vite. Los componentes separan navegación, mapa, escaneo, actividad, estadísticas y perfil.
- **Backend objetivo:** API de servidor + Neon PostgreSQL/PostGIS. Las operaciones de activación y descubrimiento deben vivir en funciones de servidor transaccionales.
- **Privacidad:** las consultas públicas del grupo solo devuelven coordenadas de pegatinas `DISCOVERED`/`REMOVED`; una `HIDDEN` únicamente se entrega a su activador. La búsqueda de proximidad devuelve un resultado semántico, nunca las candidatas.
- **Mapa:** MapLibre GL con cartografía raster de OpenStreetMap, navegación táctil, geolocalización, zoom de calle y marcadores geográficos. En producción puede configurarse un estilo vectorial propio mediante `VITE_MAP_STYLE_URL`.

## Flujos

1. `/scan` solicita varias muestras de posición y usa la de mejor precisión.
2. **Colocar:** confirma presencia física, guarda la pegatina como `HIDDEN` y publica una actividad sin datos geográficos.
3. **Encontrar:** una función RPC filtra por grupo, excluye pegatinas propias, calcula distancias con PostGIS y evita candidatos ambiguos.
4. El primer hallazgo cambia el estado a `DISCOVERED`, añade el cromo a la colección y revela su contenido privado. Otros miembros ven el punto en el mapa, pero no `sticker_content`.
5. Foto, selfie, historia y mensaje se guardan separados y solo son legibles por el activador o por usuarios con un descubrimiento válido.

## Variables de entorno previstas

```env
DATABASE_URL=postgresql://usuario:clave@host/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://usuario:clave@host/neondb?sslmode=require
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
UPLOAD_PROVIDER_TOKEN=
VITE_MAP_STYLE_URL=
GPS_IDEAL_RADIUS_METERS=25
GPS_MAX_RADIUS_METERS=50
GPS_AMBIGUITY_DELTA_METERS=12
GPS_MAX_ACCURACY_METERS=40
```

Las URLs de Neon y los secretos de autenticación son exclusivamente de servidor. Ninguna conexión a la base de datos se expone al navegador.

## Estado del prototipo

La versión incluida usa datos locales intencionadamente para que la experiencia pueda revisarse sin cuentas externas. Autenticación real, persistencia, subida de imágenes, geocodificación, teselas, rate limiting y notificaciones push requieren configurar los servicios anteriores. El esquema inicial y las políticas de acceso están en `neon/schema.sql`.


## Imágenes en Cloudflare R2

Las nuevas fotos se suben desde el servidor mediante la API S3 compatible de R2. Las credenciales solo deben existir en Render y nunca deben usar el prefijo `VITE_`.

Variables requeridas: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` y `R2_PUBLIC_URL`. Esta última debe ser la URL pública sin barra final del dominio conectado al bucket.

`GET /api/health` devuelve `r2Configured: true` cuando las cinco variables están presentes. Las imágenes Base64 antiguas siguen siendo compatibles; al cambiar una foto de perfil se migrará esa imagen a R2.