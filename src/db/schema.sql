-- Mercado Chacarero: esquema único (un monolito, una base de datos)
DROP TABLE IF EXISTS items_pedido, pedidos, productos, categorias, usuarios CASCADE;

CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  usuario        VARCHAR(40)  NOT NULL UNIQUE,
  clave_hash     VARCHAR(100) NOT NULL,
  nombre         VARCHAR(60)  NOT NULL,
  apellido       VARCHAR(60)  NOT NULL,
  rol            VARCHAR(10)  NOT NULL CHECK (rol IN ('PRODUCTOR','COMPRADOR','ADMIN')),
  telefono       VARCHAR(30),
  localidad      VARCHAR(40)  NOT NULL,
  emprendimiento VARCHAR(80),
  creado         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CHECK (rol <> 'PRODUCTOR' OR emprendimiento IS NOT NULL)
);

CREATE TABLE categorias (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE productos (
  id           SERIAL PRIMARY KEY,
  productor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id INT NOT NULL REFERENCES categorias(id),
  nombre       VARCHAR(80) NOT NULL,
  descripcion  TEXT NOT NULL DEFAULT '',
  precio       NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  unidad       VARCHAR(10) NOT NULL DEFAULT 'kg',
  stock        INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  activo       BOOLEAN NOT NULL DEFAULT true,
  creado       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pedidos (
  id           SERIAL PRIMARY KEY,
  comprador_id INT NOT NULL REFERENCES usuarios(id),
  productor_id INT NOT NULL REFERENCES usuarios(id),
  estado       VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE'
               CHECK (estado IN ('PENDIENTE','CONFIRMADO','ENTREGADO','CANCELADO')),
  modalidad    VARCHAR(10) NOT NULL DEFAULT 'RETIRO' CHECK (modalidad IN ('RETIRO','ENVIO')),
  direccion    VARCHAR(150) NOT NULL DEFAULT '',
  nota         VARCHAR(200) NOT NULL DEFAULT '',
  creado       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items_pedido (
  id              SERIAL PRIMARY KEY,
  pedido_id       INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id     INT NOT NULL REFERENCES productos(id),
  cantidad        INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL  -- foto del precio al comprar
);

CREATE INDEX ON productos (productor_id);
CREATE INDEX ON pedidos (productor_id);
CREATE INDEX ON pedidos (comprador_id);
