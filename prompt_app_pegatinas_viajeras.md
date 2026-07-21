# Prompt para crear una aplicación web de pegatinas viajeras

## Rol del agente

Actúa como un equipo senior formado por un arquitecto de software, un diseñador UX/UI, un desarrollador frontend, un desarrollador backend, un especialista en bases de datos, un especialista en seguridad y un ingeniero de QA.

Tu misión es diseñar y desarrollar una aplicación web privada, funcional, responsive, segura y preparada para crecer. No debes crear únicamente una maqueta visual: debes construir un MVP real con autenticación, base de datos, geolocalización, mapa interactivo, activación de pegatinas, descubrimientos, historial y estadísticas.

Antes de escribir código:

1. Resume la arquitectura propuesta.
2. Define el modelo de datos.
3. Explica los flujos principales.
4. Enumera las decisiones técnicas importantes.
5. Divide la implementación en fases.
6. Implementa después la aplicación fase por fase.

---

# 1. Descripción del producto

Quiero crear una aplicación web privada para un grupo de amigos.

El grupo tendrá muchas pegatinas físicas completamente idénticas. Todas tendrán:

- El mismo diseño.
- El mismo código QR.
- Ningún número.
- Ningún identificador visible.
- Ninguna diferencia física entre ellas.

Todas las pegatinas abrirán exactamente la misma URL:

```text
https://dominio.com/scan
```

La aplicación permitirá registrar dónde se coloca cada pegatina y construir un mapa colaborativo con todos los lugares explorados por el grupo.

La identidad de cada pegatina no existe físicamente. Se crea digitalmente cuando una persona registra que acaba de colocar una pegatina.

La experiencia debe sentirse como una mezcla de:

- Geocaching.
- Google Maps.
- Pokémon GO.
- Polarsteps.
- Un diario de viajes colaborativo.
- Un juego privado de exploración entre amigos.

---

# 2. Reglas principales

1. Todas las pegatinas físicas son exactamente iguales.
2. Todas contienen el mismo QR.
3. Una pegatina digital se crea cuando un usuario registra su colocación.
4. La ubicación de una pegatina permanece oculta para todos excepto para quien la colocó.
5. El resto del grupo puede saber que existe una nueva pegatina, pero no puede conocer su ubicación.
6. Otro usuario debe encontrar físicamente la pegatina y escanear el QR.
7. La aplicación identifica la pegatina mediante proximidad GPS.
8. Un usuario no puede descubrir una pegatina colocada por él mismo.
9. Una misma pegatina puede ser descubierta por varios usuarios en momentos diferentes.
10. Cada descubrimiento debe registrar quién la encontró, cuándo, desde qué ubicación y a qué distancia se encontraba del punto original.
11. Cuando una pegatina recibe su primer descubrimiento válido, su ubicación se hace visible para todo el grupo.
12. Los descubrimientos posteriores se añaden al historial de la misma pegatina.
13. El mapa debe mostrar quién la activó, cuántas personas la han descubierto, quiénes fueron y en qué momento la descubrieron.

---

# 3. Estados de una pegatina

## `HIDDEN`

La pegatina ha sido colocada y activada.

- Solo el creador puede ver su ubicación exacta.
- Los demás usuarios saben que existe una nueva pegatina.
- Las coordenadas no deben enviarse al navegador de usuarios no autorizados.
- Todavía no tiene ningún descubrimiento válido.

## `DISCOVERED`

La pegatina ha sido encontrada al menos una vez por un usuario distinto del creador.

- Su ubicación es visible para todo el grupo.
- Puede seguir acumulando descubrimientos.
- El mapa muestra el número total de descubridores únicos.
- El detalle muestra el historial completo de descubrimientos.

## `REMOVED`

La pegatina ha desaparecido, ha sido retirada o ya no existe físicamente.

- Debe conservarse el historial.
- Debe mostrarse con un estilo visual diferente.

## `ARCHIVED`

La pegatina se conserva en el histórico, pero puede ocultarse del mapa principal.

---

# 4. Autenticación y acceso

La aplicación será privada.

Implementar autenticación mediante:

- Google.
- Correo electrónico mediante enlace mágico o contraseña.
- GitHub como opción secundaria.

Solo los usuarios autorizados pueden acceder.

Para el MVP puede existir un único grupo privado, pero la arquitectura debe permitir múltiples grupos en el futuro.

Los nuevos usuarios deben:

1. Iniciar sesión.
2. Introducir un código de invitación o ser aprobados por un administrador.
3. Completar un perfil mínimo:
   - Nombre visible.
   - Nombre de usuario.
   - Avatar opcional.

---

# 5. Flujo al escanear el QR

Todas las pegatinas abren la ruta:

```text
/scan
```

Después de iniciar sesión, la aplicación debe solicitar permiso de geolocalización y mostrar dos acciones principales:

- **He colocado una pegatina**
- **He encontrado una pegatina**

La aplicación puede comprobar antes si existe una pegatina oculta cerca:

- Si existe una candidata clara, destacar la opción de descubrimiento.
- Si no existe ninguna, destacar la opción de activación.
- El usuario siempre debe confirmar la acción.

No realizar acciones irreversibles sin confirmación.

---

# 6. Flujo para activar una pegatina

Cuando un usuario pulsa **He colocado una pegatina**:

1. Solicitar permiso de ubicación.
2. Obtener latitud, longitud, precisión, fecha y hora.
3. Tomar varias muestras GPS para mejorar la precisión.
4. Mostrar la posición en un mapa de confirmación.
5. Indicar la precisión estimada.
6. Pedir una confirmación explícita:
   - “Confirmo que acabo de colocar una pegatina física en este lugar”.
7. Permitir añadir opcionalmente:
   - Título.
   - Nota o historia.
   - Fotografía.
   - Pista.
8. Crear una pegatina digital.
9. Guardarla con estado `HIDDEN`.
10. Registrar al usuario como activador.
11. Crear una actividad y una notificación para el grupo.

Los demás usuarios deben recibir:

> Se ha activado una nueva pegatina.

No deben recibir:

- Coordenadas.
- Dirección.
- Ciudad.
- Punto del mapa.
- Fotografía que pueda revelar el lugar.
- Ningún dato que permita deducir la ubicación.

El creador sí podrá verla en su mapa personal mediante un marcador privado.

---

# 7. Flujo para descubrir una pegatina

Cuando un usuario pulsa **He encontrado una pegatina**:

1. Solicitar permiso de ubicación.
2. Obtener varias muestras GPS.
3. Validar la precisión.
4. Enviar la posición al backend.
5. Buscar pegatinas `HIDDEN` o `DISCOVERED` dentro del radio permitido.
6. Excluir las pegatinas activadas por el propio usuario.
7. Calcular las distancias en el backend.
8. Determinar la candidata más probable.

## Primer descubrimiento

Si la pegatina está en estado `HIDDEN`:

1. Crear un registro de descubrimiento.
2. Cambiar el estado a `DISCOVERED`.
3. Hacer visible la ubicación para todo el grupo.
4. Crear una notificación general.
5. Añadirla inmediatamente al mapa.

Ejemplo:

> Marta ha descubierto una nueva pegatina.

## Descubrimientos posteriores

Si la pegatina ya está en estado `DISCOVERED`:

1. Comprobar que el usuario no la haya descubierto anteriormente.
2. Crear un nuevo registro de descubrimiento.
3. Mantener la ubicación visible.
4. Incrementar el contador de descubridores únicos.
5. Añadir el evento al historial.
6. Mostrar al nuevo descubridor en la ficha de la pegatina.

Ejemplo:

> Carlos también ha encontrado la pegatina de Lisboa.

Para el MVP, cada usuario debe contar una sola vez por pegatina.

---

# 8. Identificación mediante proximidad GPS

Como las pegatinas no tienen identificadores físicos únicos, la aplicación debe asociar cada escaneo con una pegatina mediante proximidad.

El backend debe:

1. Buscar pegatinas candidatas dentro de un radio máximo configurable.
2. Calcular la distancia geográfica entre el usuario y cada pegatina.
3. Ordenar por distancia.
4. Aplicar reglas de confianza.
5. No enviar nunca al frontend las ubicaciones de candidatas ocultas.

Configuración inicial sugerida:

```text
Radio ideal: 25 metros
Radio habitual máximo: 50 metros
Radio ampliado en zonas urbanas: 80 metros
Precisión GPS máxima aceptable: configurable
```

Estos valores deben configurarse mediante variables de entorno o parámetros de administración.

## Una candidata clara

Si existe una única pegatina dentro del radio permitido, registrar el descubrimiento.

## Varias candidatas

Si existen varias pegatinas cercanas:

- No elegir automáticamente si las distancias son similares.
- Mostrar: “Hay varias pegatinas cerca. Acércate más a la que has encontrado y vuelve a intentarlo”.
- Seleccionar automáticamente la más cercana solo si la diferencia de distancia es suficientemente clara.
- No mostrar ubicaciones, direcciones ni distancias de pegatinas ocultas.

## Ninguna candidata

Mostrar:

> No hemos encontrado ninguna pegatina registrada suficientemente cerca. Comprueba que el GPS está activado y vuelve a intentarlo junto a la pegatina.

---

# 9. Mapa principal

El mapa es la parte central de la aplicación.

Debe ofrecer una experiencia similar a Google Maps en cuanto a navegación, fluidez y nivel de detalle, sin copiar su interfaz ni sus elementos protegidos.

Debe incluir:

- Mapa mundial interactivo.
- Zoom fluido desde vista global hasta nivel de calle.
- Posibilidad de ampliar con mucho detalle.
- Visualización de calles, edificios, ciudades, regiones y países.
- Movimiento mediante arrastre.
- Zoom mediante gestos táctiles.
- Zoom con rueda del ratón.
- Botones para ampliar y reducir.
- Botón para centrar el mapa en la ubicación actual.
- Brújula y rotación opcionales.
- Geolocalización del usuario.
- Carga progresiva de marcadores.
- Agrupación de marcadores cuando haya muchos puntos.
- Desagrupación automática al aumentar el zoom.
- Buen rendimiento con cientos o miles de pegatinas.
- Diseño responsive para móvil, tableta y escritorio.
- Controles accesibles por teclado.

Tecnologías posibles:

- Mapbox GL JS.
- MapLibre GL JS con un proveedor de teselas compatible.

El mapa debe permitir:

- Vista de calles.
- Vista satélite, si el proveedor lo permite.
- Cambio de estilo.
- Navegación hasta nivel de calle.
- Ajuste automático del encuadre para mostrar marcadores.
- Búsqueda por ciudad, país o dirección.
- Geocodificación inversa para mostrar una ubicación legible.

---

# 10. Marcadores del mapa

Cada marcador representa una pegatina visible.

Diferenciar visualmente:

- Pegatinas descubiertas.
- Pegatinas activadas por el usuario que todavía siguen ocultas.
- Pegatinas retiradas.
- Pegatinas descubiertas recientemente.
- Pegatinas con muchos descubrimientos.

Los usuarios nunca deben recibir ni ver marcadores correspondientes a pegatinas ocultas de otras personas.

Al alejar el mapa, agrupar los marcadores en clústeres con el número de pegatinas de cada zona.

Al acercar el mapa, separar progresivamente los marcadores hasta mostrar cada pegatina individual.

---

# 11. Información de cada pegatina en el mapa

Al pulsar un marcador, abrir una tarjeta, popup, panel lateral o panel inferior.

Debe mostrar como mínimo:

- Título de la pegatina.
- Usuario que la activó.
- Avatar del activador.
- Fecha y hora exactas de activación.
- Ciudad, país o dirección aproximada.
- Estado actual.
- Tiempo que permaneció oculta antes del primer descubrimiento.
- Número total de descubrimientos.
- Número de descubridores únicos.
- Nombre y avatar de todas las personas que la descubrieron.
- Fecha y hora de cada descubrimiento.
- Orden cronológico de descubrimientos.
- Quién fue la primera persona en descubrirla.
- Quién fue la última persona en descubrirla.
- Cuánto tiempo pasó desde la activación hasta cada descubrimiento.
- Fotografía, historia o comentario, cuando existan.

Ejemplo:

```text
Pegatina en Lisboa

Activada por:
Laura
12 de marzo de 2026, 18:42

Descubierta por 4 personas:

1. Marcos — 14 de marzo de 2026, 11:05
2. Ana — 18 de marzo de 2026, 16:27
3. Carlos — 3 de abril de 2026, 09:14
4. Elena — 21 de abril de 2026, 20:03
```

En móvil, mostrar esta información mediante un panel deslizable desde la parte inferior.

En escritorio, usar un panel lateral o popup ampliado.

---

# 12. Página de detalle de una pegatina

Crear una ruta:

```text
/stickers/[id]
```

Debe incluir:

- Mapa centrado en la ubicación exacta.
- Nivel de zoom suficiente para reconocer la calle o zona.
- Usuario que la activó.
- Fecha de activación.
- Estado.
- Tiempo hasta el primer descubrimiento.
- Número de descubridores únicos.
- Lista completa de descubridores.
- Fecha y hora de cada descubrimiento.
- Cronología de actividad.
- Fotografía.
- Historia.
- Dirección aproximada.
- Ciudad y país.
- Estadísticas.
- Acciones de administración cuando proceda.

La URL nunca debe revelar datos privados de una pegatina oculta a usuarios sin permiso.

---

# 13. Cronología de descubrimientos

Cada pegatina debe tener una línea temporal completa.

Eventos posibles:

- Activación.
- Primer descubrimiento.
- Descubrimientos posteriores.
- Cambio de estado.
- Edición.
- Retirada.
- Archivado.

Cada evento debe guardar:

- Tipo de evento.
- Usuario responsable.
- Fecha y hora.
- Metadatos.
- Ubicación del descubrimiento cuando corresponda.
- Distancia respecto al punto original.

Guardar todas las fechas en UTC y mostrarlas en la zona horaria del usuario.

---

# 14. Feed de actividad del grupo

Crear una cronología global.

Ejemplos:

```text
Laura ha activado una nueva pegatina.
Marcos ha descubierto una pegatina en Lisboa.
Ana también ha encontrado la pegatina de Lisboa.
Carlos ha colocado su décima pegatina.
Una pegatina lleva 30 días sin ser descubierta.
```

Para pegatinas ocultas:

- No mostrar ubicación.
- No mostrar ciudad.
- No mostrar dirección.
- No mostrar pistas involuntarias.

Para pegatinas descubiertas:

- Mostrar ciudad y país.
- Mostrar fotografía si existe.
- Permitir abrir la página de detalle.

---

# 15. Perfil de usuario

Cada perfil debe mostrar:

- Nombre.
- Avatar.
- Fecha de incorporación.
- Número de pegatinas activadas.
- Número de pegatinas descubiertas.
- Número de primeros descubrimientos.
- Países explorados.
- Ciudades exploradas.
- Mapa personal.
- Cronología personal.
- Pegatinas colocadas.
- Pegatinas encontradas.
- Pegatinas encontradas en primer lugar.
- Pegatinas propias todavía ocultas.

---

# 16. Estadísticas

Implementar:

- Total de pegatinas activadas.
- Total de pegatinas descubiertas.
- Total de pegatinas ocultas.
- Total de descubrimientos.
- Descubridores únicos por pegatina.
- Usuario que más pegatinas ha colocado.
- Usuario que más pegatinas ha encontrado.
- Usuario con más primeros descubrimientos.
- Tiempo medio hasta el primer descubrimiento.
- Pegatina más descubierta.
- Países y ciudades con mayor actividad.
- Descubrimientos por mes.

Nunca revelar ubicaciones ocultas mediante estadísticas.

---

# 17. Modelo de datos

Usar una base de datos relacional normalizada.

## `profiles`

```text
id
display_name
username
avatar_url
created_at
updated_at
```

## `groups`

```text
id
name
invite_code
created_by
created_at
```

## `group_members`

```text
id
group_id
user_id
role
joined_at
```

Roles:

```text
admin
member
```

## `stickers`

```text
id
group_id
activated_by
status
latitude
longitude
location_accuracy
title
story
photo_url
activated_at
first_discovered_at
removed_at
created_at
updated_at
```

## `discoveries`

Una pegatina puede tener múltiples descubrimientos:

```text
id
sticker_id
discovered_by
latitude
longitude
location_accuracy
distance_from_sticker
discovered_at
created_at
```

Crear la restricción:

```text
UNIQUE(sticker_id, discovered_by)
```

Esto evita que un mismo usuario cuente varias veces como descubridor de la misma pegatina.

## `activities`

```text
id
group_id
actor_id
sticker_id
activity_type
metadata
created_at
```

## `notifications`

```text
id
user_id
group_id
sticker_id
type
title
body
read_at
created_at
```

---

# 18. Seguridad y privacidad

Requisitos obligatorios:

1. No enviar coordenadas ocultas al frontend de usuarios no autorizados.
2. Aplicar Row Level Security.
3. Validar permisos en backend.
4. Calcular distancias en backend.
5. No confiar en valores enviados por el navegador.
6. Registrar precisión GPS.
7. Limitar intentos repetidos.
8. Impedir que un usuario descubra su propia pegatina.
9. Impedir descubrimientos duplicados.
10. Proteger rutas privadas.
11. No exponer claves privadas.
12. Validar archivos subidos.
13. Añadir protección frente a abuso y spam.
14. No incluir ubicaciones ocultas en notificaciones, logs públicos o analítica.

---

# 19. Tecnologías recomendadas

## Frontend

- Next.js con App Router.
- React.
- TypeScript estricto.
- Tailwind CSS.
- shadcn/ui.
- Framer Motion.

## Backend

- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Realtime.
- Edge Functions o rutas seguras de servidor.

## Geolocalización y mapas

- Mapbox GL JS o MapLibre GL JS.
- PostGIS para búsquedas por proximidad.
- Geocodificación directa e inversa.
- Clustering de marcadores.

## Despliegue

- Vercel.
- Supabase.
- Variables de entorno separadas por entorno.

---

# 20. Diseño visual

Crear una interfaz:

- Mobile-first.
- Minimalista.
- Moderna.
- Clara.
- Emocional.
- Accesible.
- Rápida.

Inspiración visual:

- Apple.
- Airbnb.
- Linear.
- Notion.
- Google Maps en facilidad de navegación.

No copiar interfaces exactas.

Usar:

- Mucho espacio en blanco.
- Tipografía limpia.
- Jerarquía visual clara.
- Animaciones suaves.
- Modo oscuro.
- Estados de carga.
- Skeletons.
- Mensajes de error comprensibles.
- Feedback visual al activar o descubrir una pegatina.

---

# 21. Navegación principal

En móvil, usar una barra inferior con:

- Mapa.
- Actividad.
- Escanear.
- Estadísticas.
- Perfil.

En escritorio, usar barra lateral o navegación superior.

La acción de escanear debe ser especialmente visible.

---

# 22. Rendimiento

El mapa debe seguir siendo fluido con muchos registros.

Implementar:

- Clustering.
- Consultas por límites visibles del mapa.
- Paginación.
- Carga diferida.
- Caché cuando proceda.
- Optimización de imágenes.
- Consultas geoespaciales eficientes.
- Índices PostGIS.
- Evitar renderizados innecesarios.

---

# 23. Pruebas

Crear pruebas para:

- Activación de pegatinas.
- Primer descubrimiento.
- Descubrimientos posteriores.
- Restricción de descubrimiento propio.
- Prevención de duplicados.
- Reglas de proximidad.
- Privacidad de ubicaciones ocultas.
- Permisos.
- Mapa y marcadores.
- Cronología.
- Estadísticas.
- Flujos de error de GPS.

Usar pruebas unitarias, de integración y end-to-end.

---

# 24. MVP obligatorio

La primera versión debe incluir:

1. Registro e inicio de sesión.
2. Acceso privado al grupo.
3. Perfil básico.
4. Ruta común del QR.
5. Activación de una pegatina.
6. Ubicación oculta para el resto.
7. Notificación de nueva pegatina.
8. Descubrimiento mediante proximidad GPS.
9. Primer descubrimiento que desbloquea la ubicación.
10. Descubrimientos posteriores.
11. Mapa interactivo con zoom hasta nivel de calle.
12. Marcadores agrupados.
13. Ficha de cada pegatina.
14. Usuario que la activó.
15. Número de descubridores.
16. Lista de descubridores.
17. Fecha y hora de cada descubrimiento.
18. Página de detalle.
19. Feed de actividad.
20. Estadísticas básicas.
21. Seguridad mediante RLS.
22. Diseño responsive.

---

# 25. Entregables esperados

Entregar:

1. Arquitectura.
2. Diagrama lógico de datos.
3. Esquema SQL.
4. Políticas RLS.
5. Estructura de carpetas.
6. Variables de entorno.
7. Componentes principales.
8. Rutas.
9. Endpoints o funciones de servidor.
10. Implementación del mapa.
11. Algoritmo de proximidad.
12. Interfaz responsive.
13. Datos de prueba.
14. Pruebas automatizadas.
15. README de instalación.
16. Instrucciones de despliegue.
17. Lista de decisiones y limitaciones conocidas.

---

# 26. Criterios de aceptación

El trabajo se considerará correcto cuando:

- Todas las pegatinas puedan tener exactamente el mismo QR.
- Un usuario pueda activar una pegatina sin asignarle un código físico.
- La ubicación oculta solo sea visible para el activador.
- Otro usuario pueda descubrirla físicamente mediante proximidad.
- El primer descubrimiento haga visible la ubicación para todos.
- Otros usuarios puedan registrar descubrimientos posteriores.
- El mapa permita ampliar desde una vista mundial hasta nivel de calle.
- Al pulsar una pegatina se muestre quién la activó.
- Se muestre cuántas personas la han descubierto.
- Se muestre quiénes la descubrieron.
- Se muestre la fecha y hora de cada descubrimiento.
- El mapa sea fluido, responsive y fácil de usar.
- Ninguna ubicación oculta se filtre al cliente.
- La aplicación pueda desplegarse y utilizarse como un MVP real.
