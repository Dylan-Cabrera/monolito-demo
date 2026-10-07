# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Canto de Hornero** ("Que tu producción se escuche."): a deliberately **monolithic** Express 5 + EJS + PostgreSQL marketplace for Formosa producers. It doubles as teaching material: `/` (3D landing) and `/arquitectura` (11-step 3D exhibition guide) are served by the same process and explain the monolith they live in. The name, tagline and three.js scenes are binding product decisions (see `PRODUCT.md`); `FICHA_TECNICA.md` is the technical sheet handed out with the presentation.

Code, identifiers, comments, UI copy and commit messages are in Spanish (rioplatense "vos" in user-facing text). Keep that.

## Commands

```bash
docker compose up -d      # optional: PostgreSQL 16 on :5432 (user/pass postgres, db chacra)
npm install
npm run semilla           # DROPS and recreates all tables, then loads demo data
npm start                 # http://localhost:3000
npm run dev               # same, with node --watch
npm test                  # node:test + supertest, integration tests against a real DB
node --test --test-name-pattern="cancelar" tests/app.test.js   # single test by name
```

- `.env` (copy from `.env.example`): `PORT`, `DATABASE_URL`, `SESSION_SECRET`.
- Tests need a separate database: `CREATE DATABASE chacra_test;` (compose only creates `chacra`; `docker/init.sql` is an empty placeholder). Override with `TEST_DATABASE_URL`. The test file forces `DATABASE_URL` to the test DB before requiring the app, and its `before` hook runs `schema.sql`, which **drops every table**, so never point it at a database you care about.
- Tests in `tests/app.test.js` share state and run in order (later tests rely on the pedido and stock left by earlier ones); a test run in isolation with `--test-name-pattern` may fail for that reason.
- There is no linter, build step or migration tool. Schema changes go in `src/db/schema.sql` and are applied by re-running `npm run semilla`.
- Demo logins after seeding: `don_ramon` / `laura` (`demo1234`), `admin` (`admin1234`).

## Architecture

One repo, one process, one deploy, one database. That is the point of the project: do not introduce a separate frontend, an internal HTTP API between modules, a second datastore, or CDN-hosted assets.

```
Navegador → rutas.js (Express Router) → servicio.js (reglas + SQL) → PostgreSQL
                  ↘ views/<modulo>/*.ejs → HTML
```

- `src/app.js` builds and exports the app (no `listen`, so tests import it directly); `src/server.js` loads dotenv and listens.
- `src/modulos/<nombre>/` has `rutas.js` (thin controller: parse request, call service, flash, render/redirect) and `servicio.js` (business rules and raw SQL via `pg`; no ORM). Modules: `usuarios`, `catalogo`, `pedidos`, `reportes`, `guia`. Modules call each other by `require` (`guia/rutas.js` imports `reportes/servicio`), never over the network.
- `src/db/pool.js` exports the shared `pool` and `transaccion(fn)` (BEGIN/COMMIT/ROLLBACK around `fn(client)`). Multi-statement writes must go through `transaccion` and lock rows with `FOR UPDATE`, as `pedidos/servicio.js` does. NUMERIC columns are parsed to JS numbers here.
- Sessions live in the same Postgres (`connect-pg-simple`, table auto-created). The cart is session state: `req.session.carrito = { productoId: cantidad }`.

### Conventions that span files

- **Errors:** services throw `ErrorNegocio(msg, status = 400)` from `src/errores.js`. Routes catch the 400s and turn them into a flash message + redirect; they rethrow 403/404, which the final handler in `app.js` renders with `views/error.ejs`. Express 5 forwards rejected async handlers, so there are no `try/catch → next(err)` wrappers.
- **Auth:** `cargarUsuario` (global) sets `req.usuario` and `res.locals.usuario`; guard routes with `requiereLogin` or `requiereRol('PRODUCTOR' | 'COMPRADOR' | 'ADMIN')`. Ownership checks (a producer only touches their own products/orders) live in the services, not the middleware.
- **View locals** set once in `app.js` and available in every template: `usuario`, `flash`, `C` (`src/constantes.js`), `pesos()` formatter, `ruta`, `carritoCantidad`, `pid`, `t0`. The footer partial shows the PID and response time as live evidence of the single process.
- **Domain constants** (`src/constantes.js`): the DB stores keys (`PENDIENTE`, `RETIRO`, `kg`), the constants map them to display labels, and `TRANSICIONES` is the order state machine. The same enums are duplicated as `CHECK` constraints in `schema.sql`; change both together.
- **Order rules** (covered by tests; preserve them): confirming a cart is one transaction that creates one pedido per producer; items snapshot `precio_unitario`; cancelling restores stock; buyers can only cancel; a product with sales is hidden (`activo = false`) instead of deleted.

### 3D landing and guide

- three.js and the fonts are served from `node_modules` via static mounts in `app.js` (`/vendor/three`, `/vendor/three-addons`, `/fuentes/*`) and resolved with the import map in `views/parciales/escena_head.ejs`. The guide must work offline in a classroom.
- `src/modulos/guia/pasos.js` is the single source for the guide: each step holds the panel text plus an `escena` object (camera preset, flow, labels, focus…). `views/guia/arquitectura.ejs` renders the text server-side and passes the scene states to the browser as `window.GUIA`; `public/js/guia.js` handles navigation (keys, `#paso-N`) and merges each step's `escena` over a `BASE` state so jumping to any step looks the same as arriving in order; `public/js/escena.js` (`crearEscena`) draws it, with `hornero.js` and `formosa-geo.js` as helpers. Adding a camera preset, label group or flow means touching both `pasos.js` and `escena.js`.
- `GET /arquitectura/pulso` returns live counts + PID as JSON for the `[data-vivo]` elements; it is the only JSON endpoint.
- The guide degrades to text-only when WebGL is missing; keep that fallback.
- Theme: dark by default, light toggle in `public/js/tema.js` via `data-tema` on `<html>`, persisted in `localStorage`. The landing scene (`hornero.js`) watches `data-tema` and swaps its ambience (day sky in light). `/arquitectura` passes `temaFijo: 'oscuro'` to `parciales/cabecera`, which pins the theme and hides the toggle; `escena.js` has a dark-only palette.

---

## Contexto del equipo (en castellano)

Este archivo lo usan tanto Claude Code como el grupo (Augusto, Dylan, Diego, Felipe, Franco). Lo que sigue son reglas y notas que no están en el PDF ni se detectan solas del código.

### Estado actual del trabajo

- **Fase 0 cerrada**: baseline verde (8/8 tests pasando), fix de Docker aplicado (`docker/init.sql` creado como placeholder vacío), rama `franco/analisis-y-refinamiento` pusheada al remoto.
- **Próxima fase**: Fase 1 (seguridad mínima — CSRF + helmet + rate-limit + cobertura de tests para el módulo `reportes`).
- Después vienen Fase 2 (el reveal UX de la presentación), Fase 3 (figuras del PDF + cerrar placeholders) y Fase 4 (pulido de diseño).

### Reglas inviolables del monolito

Si Claude Code propone algo que viola cualquiera de estas, rechazar o pedir alternativa:

1. **Un repo, un proceso, un despliegue, una base de datos.** No agregar un segundo servicio en `docker-compose.yml`: rompería el discurso académico del monolito.
2. **Los módulos se llaman por `require`, nunca por HTTP ni fetch interno.** Ejemplo canónico: `guia/rutas.js` hace `require('../reportes/servicio')`.
3. **La presentación son vistas EJS renderizadas en el servidor.** No introducir React, Vue, Next, Astro, Svelte ni ningún framework de frontend separado.
4. **Las sesiones viven en la misma Postgres** vía `connect-pg-simple`. No mover a Redis ni a memoria.
5. **Las transacciones multi-tabla usan `transaccion()` de `src/db/pool.js`** con `FOR UPDATE` donde haya stock o estados.
6. **No borrar un producto con ventas**: ocultarlo con `activo = false` para preservar el historial.
7. **Mantener el PID en el footer de cada página** (`views/parciales/pie.ejs`): es la evidencia visible de que el monolito es un solo proceso.

### Qué NO hacer

- No reemplazar EJS por otro motor de templates.
- No introducir un ORM (Prisma, Sequelize, TypeORM): seguimos con `pg` y SQL crudo.
- No crear una API JSON pública para que una SPA la consuma. El único endpoint JSON es `/arquitectura/pulso` y es para los números en vivo de la guía.
- No agregar un bundler (webpack, vite, esbuild) para el frontend: three.js se sirve directo desde `node_modules` por el mismo Express.
- No tocar `src/db/schema.sql` sin acuerdo con el grupo: cualquier cambio obliga a actualizar `semilla.js` y los tests.
- No borrar tests sin reemplazarlos.
- No commitear el `.env` real ni ningún `SESSION_SECRET` fuerte en el repo.
- No agregar links a `/arquitectura` ni a `/` dentro del flujo de la app: la regla UX es "desde la app no se vuelve a la presentación".

### Decisiones pendientes del grupo

- **Opción A o B para el reveal en Fase 2**: una `cabecera.ejs` con parámetro `modo` (recomendada) vs dos cabeceras separadas (`cabecera_pres.ejs` + `cabecera_app.ejs`).
- **Imágenes de productos**: respetar el "sin fotos" del PDF o agregar un campo `imagen_url`.
- **Figuras del PDF**: generarlas con Mermaid en `docs/figuras/` dentro del repo o dibujarlas aparte y subir PNG.

### Convenciones adicionales

- Nombres en castellano consistentes con lo existente: `compradorId`, `productorId`, `pedidoId`, `productoId`, `carrito`, `productor`, `comprador`.
- Mensajes al usuario en voseo rioplatense: "ingresá", "guardá", "cancelá", "sumá al carrito".
- Comentarios en castellano explicando el "por qué" en lógica crítica (transacciones, autorización, borrado lógico).
- Flash messages: `req.flash('ok', 'texto')` para éxito, `req.flash('error', 'texto')` para error.
- Errores de negocio: `throw new ErrorNegocio('mensaje humano', codigoHTTP)` desde los servicios.

### Flujo de trabajo con Claude Code

- Una conversación por fase. No mezclar Fase 1 (seguridad) con Fase 2 (reveal) en la misma sesión: se enreda el contexto.
- Antes de cualquier cambio grande, pedirle a Claude Code que lea los archivos relevantes y proponga un plan sin aplicar nada todavía.
- Después de cada cambio, correr `npm test` y verificar que siguen pasando todos los tests (hoy 8/8).
- Los `git commit` los hacemos manualmente desde Git Bash para controlar el mensaje y lo que entra; no delegar el commit a Claude Code.
- Commits chicos y descriptivos en castellano. Ejemplos: `feat(seguridad): agrega protección CSRF a formularios POST`, `fix(reveal): logo del header no linkea a la presentación desde dentro de la app`.