module.exports = {
  LOCALIDADES: ['Formosa', 'Clorinda', 'Pirané', 'El Colorado', 'Ibarreta', 'Las Lomitas',
    'Laguna Blanca', 'Ingeniero Juárez', 'Comandante Fontana', 'Herradura'],
  UNIDADES: { kg: 'kilo', u: 'unidad', doc: 'docena', l: 'litro', atado: 'atado', frasco: 'frasco' },
  ESTADOS: { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' },
  MODALIDADES: { RETIRO: 'Retiro en la chacra / punto de encuentro', ENVIO: 'Envío a domicilio (a coordinar)' },
  // Regla de negocio: transiciones válidas de un pedido
  TRANSICIONES: { PENDIENTE: ['CONFIRMADO', 'CANCELADO'], CONFIRMADO: ['ENTREGADO', 'CANCELADO'], ENTREGADO: [], CANCELADO: [] },
};
