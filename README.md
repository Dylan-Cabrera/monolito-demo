# Mercado Chacarero

Aplicación web **monolítica** para que los productores de Formosa vendan directo, sin intermediarios.
Incluye una portada 3D y una guía de exposición en `/arquitectura`, servidas por el mismo monolito.

## Requisitos
- Node.js 20 o superior: https://nodejs.org
- PostgreSQL 14 o superior: https://www.postgresql.org/download/

## Instalación (Windows, macOS o Linux)
1. Crear la base de datos. En pgAdmin o en `psql`:
   ```sql
   CREATE DATABASE chacra;
   ```
2. Copiar `.env.example` a `.env` y poner la clave de tu usuario de PostgreSQL:
   ```
   DATABASE_URL=postgres://postgres:TU_CLAVE@localhost:5432/chacra
   ```
3. En la carpeta del proyecto:
   ```bash
   npm install
   npm run semilla     # crea las tablas y carga datos de demo
   npm start           # http://localhost:3000
   ```

## Usuarios de demostración
| Usuario | Clave | Rol |
|---|---|---|
| don_ramon, dona_celsa, ana_lomitas, lucho_clorinda, maria_colorado | demo1234 | Productor |
| laura | demo1234 | Compradora |
| admin | admin1234 | Administrador provincial |

## Pruebas
Crear una base aparte (`CREATE DATABASE chacra_test;`) y correr:
```bash
npm test
```
Si tu clave de PostgreSQL no es `postgres`, definí `TEST_DATABASE_URL` con la URL completa.

## Guía de exposición
- `/` portada 3D
- `/arquitectura` guía en 11 pasos, dividida en 5 partes, una por expositor
- Teclas: flechas o espacio para avanzar o retroceder, **H** para ocultar el panel, **F** para pantalla completa
- Para saltar a un paso: `/arquitectura#paso-7`
- Funciona **sin internet**: three.js y las fuentes los sirve el propio servidor

**Antes de exponer:** probá la guía en la compu del aula. La escena 3D necesita aceleración gráfica (WebGL).
