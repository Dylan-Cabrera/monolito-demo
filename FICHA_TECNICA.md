# Ficha técnica: Mercado Chacarero

## 1. Datos generales
| Campo | Detalle |
|---|---|
| Nombre | Mercado Chacarero |
| Tipo | Aplicación web con arquitectura **monolítica** |
| Problemática | Los pequeños productores del interior de Formosa dependen de intermediarios para vender. Pierden margen y no controlan el precio, y el comprador no conoce el origen del producto. |
| Solución | Catálogo donde el productor publica y fija su precio, y el comprador pide directo. Un tablero muestra lo vendido por localidad. |
| Usuarios | Productor, comprador y administrador provincial |

## 2. Stack tecnológico
| Capa | Tecnología | Rol en el monolito |
|---|---|---|
| Presentación | EJS + HTML + CSS | El servidor arma las páginas (SSR); no hay un front separado |
| Visualización | three.js 0.186 | Escena 3D de la portada y de la guía, servida por el mismo Express |
| Lógica / servidor | Node.js 22 + Express 5 | Un solo proceso atiende todas las rutas |
| Datos | PostgreSQL 16 (driver `pg`) | Una única base para datos y sesiones |
| Seguridad | bcryptjs, express-session, connect-pg-simple | Claves con hash; sesiones guardadas en la misma base |
| Pruebas | node:test + supertest | 8 pruebas de integración contra una base de prueba |

## 3. Arquitectura
**Un repositorio, un proceso (`npm start`), un despliegue, una base de datos.**
Adentro, el código se ordena en capas y módulos que se llaman por funciones, no por red.

```
Navegador → Rutas (Express) → Servicios (lógica + SQL) → PostgreSQL
                    ↘ Vistas EJS → HTML → Navegador
```

| Módulo (`src/modulos/`) | Responsabilidad | Tablas |
|---|---|---|
| usuarios | Registro, ingreso, roles | usuarios |
| catalogo | Publicar, editar, buscar y filtrar productos | productos, categorias |
| pedidos | Carrito, confirmación, stock, estados | pedidos, items_pedido |
| reportes | Resumen del productor, tablero provincial | (consultas) |
| guia | Portada 3D y guía de exposición | (usa reportes) |

Cada módulo tiene `rutas.js` (controlador) y `servicio.js` (reglas de negocio y SQL).

## 4. Reglas de negocio (implementadas y probadas)
1. Solo el productor dueño puede editar o borrar sus productos.
2. Confirmar una compra ocurre en **una transacción**: se bloquean las filas (`FOR UPDATE`), se descuenta stock y se crean pedido e ítems. Si algo falla, `ROLLBACK`.
3. Un carrito con productos de varios productores genera un pedido por productor.
4. Estados: Pendiente → Confirmado → Entregado. Se puede cancelar desde Pendiente o Confirmado. El comprador solo puede cancelar.
5. Cancelar repone el stock.
6. El ítem guarda el precio del momento de la compra.
7. Un producto con ventas no se borra: se oculta, para proteger el historial.
8. La base impone `CHECK`: precio mayor a 0, stock de 0 o más, y estados y roles válidos.

## 5. Modelo de datos (base del DER)
| Tabla | Clave | Relaciones |
|---|---|---|
| usuarios | id | 1:N productos (productor_id); 1:N pedidos como comprador y como productor |
| categorias | id | 1:N productos |
| productos | id | N:1 usuarios, N:1 categorias, 1:N items_pedido |
| pedidos | id | N:1 usuarios (comprador_id), N:1 usuarios (productor_id), 1:N items_pedido |
| items_pedido | id | N:1 pedidos, N:1 productos |

El esquema completo está en `src/db/schema.sql`.

## 6. Rutas principales
| Ruta | Acceso | Función |
|---|---|---|
| `/` | Público | Portada 3D con números en vivo |
| `/arquitectura` | Público | Guía de exposición en 3D |
| `/productos`, `/productos/:id` | Público | Catálogo, filtros y detalle |
| `/carrito` | Público (confirmar requiere ingreso) | Carrito y envío del pedido |
| `/mis-compras` | Comprador | Seguimiento y cancelación |
| `/panel/productos` | Productor | Alta, edición y baja |
| `/panel/ventas` | Productor | Confirmar, entregar, cancelar |
| `/panel/resumen` | Productor | Total vendido y productos más vendidos |
| `/tablero` | Administrador | Ventas por localidad y categoría |

## 7. Evidencia visible del monolito
- El pie de cada página muestra el **PID** del proceso y el tiempo de respuesta: siempre es el mismo proceso.
- La guía 3D y la app comparten servidor, base y código (`guia` importa directamente `reportes/servicio`).

## 8. Ventajas y límites
**Ventajas:** desarrollo y pruebas simples; un solo despliegue; transacciones naturales; módulos que se comunican sin latencia de red.
**Límites:** escala solo en bloque (copiar todo el sistema); un error grave puede afectar a todos los módulos; cambiar de tecnología cuesta más.
**Evolución posible:** los módulos ya tienen fronteras claras; `pedidos` sería el primer candidato a separarse si el volumen lo justificara.
