// Escena 3D del monolito sobre el mapa de Formosa.
// La sirve el mismo servidor Express (sin CDN): funciona sin internet.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONTORNO, PILCOMAYO, PARAGUAY, BERMEJO } from '/js/formosa-geo.js';

const COL = {
  fondo: 0x10232b, provincia: 0x21495a, borde: 0x5f97a6, rio: 0x4fb3c4,
  pomelo: 0xf4b13e, tierra: 0xd2603a, monte: 0x8cc09a, gris: 0x7d8b8a, capa: 0x1f4552, error: 0xf0563c,
};

// lon/lat → coordenadas de escena (x este, z sur)
const geo = (lon, lat, y = 0) => new THREE.Vector3((lon + 59.8) * 4.6, y, -(lat + 24.6) * 4.6);

const LOCALIDADES = {
  'Formosa': [-58.17, -26.18], 'Clorinda': [-57.72, -25.28], 'Pirané': [-59.11, -25.73],
  'El Colorado': [-59.37, -26.27], 'Ibarreta': [-59.86, -25.21], 'Las Lomitas': [-60.59, -24.71],
  'Laguna Blanca': [-58.25, -25.13], 'Ingeniero Juárez': [-61.85, -23.9],
  'Comandante Fontana': [-59.68, -25.33], 'Herradura': [-58.31, -26.49],
};

export function crearEscena(contenedor, { modo = 'guia', onFase = () => {} } = {}) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ancho = () => contenedor.clientWidth, alto = () => contenedor.clientHeight;

  // ---------- Render ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(ancho(), alto());
  contenedor.appendChild(renderer.domElement);
  const etiquetas = new CSS2DRenderer();
  etiquetas.setSize(ancho(), alto());
  etiquetas.domElement.className = 'capa-etiquetas';
  contenedor.appendChild(etiquetas.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(COL.fondo);
  escena.fog = new THREE.FogExp2(COL.fondo, 0.011);
  const camara = new THREE.PerspectiveCamera(42, ancho() / alto(), 0.1, 200);
  camara.position.set(-1, 15, 19);

  const controles = new OrbitControls(camara, etiquetas.domElement);
  controles.enableDamping = true;
  controles.maxPolarAngle = Math.PI * 0.47;
  controles.minDistance = 4; controles.maxDistance = 40;
  if (modo === 'portada') { controles.enableZoom = false; controles.enablePan = false; }

  escena.add(new THREE.HemisphereLight(0xcfe3dd, COL.fondo, 1.1));
  const sol = new THREE.DirectionalLight(0xffe2b0, 1.6);
  sol.position.set(8, 16, 6); escena.add(sol);

  // ---------- Etiquetas ----------
  const listaEtiquetas = [];
  function etiqueta(texto, grupo, clase = '') {
    const el = document.createElement('div');
    el.className = `et ${clase}`; el.textContent = texto;
    const o = new CSS2DObject(el); o.userData.grupo = grupo;
    listaEtiquetas.push(o);
    return o;
  }

  // ---------- Provincia ----------
  const borde = CONTORNO; // calcado del mapa oficial
  const forma = new THREE.Shape(borde.map(([lo, la]) => { const v = geo(lo, la); return new THREE.Vector2(v.x, -v.z); }));
  const suelo = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.25, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: COL.provincia, roughness: 0.95 }));
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.25;
  escena.add(suelo);
  const contorno = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(borde.map(([lo, la]) => geo(lo, la, 0.02))),
    new THREE.LineBasicMaterial({ color: COL.borde }));
  escena.add(contorno);

  for (const [puntos, nombre] of [[PILCOMAYO, 'Río Pilcomayo'], [PARAGUAY, 'Río Paraguay'], [BERMEJO, 'Río Bermejo']]) {
    const curva = new THREE.CatmullRomCurve3(puntos.map(([lo, la]) => geo(lo, la, 0.05)));
    escena.add(new THREE.Mesh(new THREE.TubeGeometry(curva, puntos.length * 3, 0.09, 6),
      new THREE.MeshStandardMaterial({ color: COL.rio, emissive: COL.rio, emissiveIntensity: 0.6 })));
    const e = etiqueta(nombre, 'rios', 'rio'); e.position.copy(curva.getPoint(0.5)).add(new THREE.Vector3(0, 0.4, 0));
    escena.add(e);
  }

  // ---------- Pines de productores ----------
  const pines = [];
  const geoCabeza = new THREE.SphereGeometry(0.22, 16, 12);
  const geoAnillo = new THREE.RingGeometry(0.3, 0.38, 32);
  for (const [nombre, [lo, la]] of Object.entries(LOCALIDADES)) {
    if (['Formosa', 'Herradura', 'Comandante Fontana'].includes(nombre)) continue; // capital = monolito; evitar pines encimados
    const base = geo(lo, la);
    const g = new THREE.Group(); g.position.copy(base);
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9), new THREE.MeshStandardMaterial({ color: COL.pomelo }));
    palo.position.y = 0.45;
    const cabeza = new THREE.Mesh(geoCabeza, new THREE.MeshStandardMaterial({ color: COL.pomelo, emissive: COL.pomelo, emissiveIntensity: 0.5 }));
    cabeza.position.y = 1;
    const anillo = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color: COL.pomelo, transparent: true, side: THREE.DoubleSide }));
    anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.03;
    const e = etiqueta(nombre, 'pines', 'pin'); e.position.y = 1.5;
    g.add(palo, cabeza, anillo, e); escena.add(g);
    pines.push({ g, salida: base.clone().setY(1), anillo, fase: Math.random() * 3 });
  }

  // ---------- Intermediario (el problema) ----------
  const posInter = new THREE.Vector3(-0.5, 3.6, 0.8);
  const inter = new THREE.Mesh(new THREE.OctahedronGeometry(1.1),
    new THREE.MeshStandardMaterial({ color: COL.gris, flatShading: true, transparent: true }));
  inter.position.copy(posInter); escena.add(inter);
  const eInter = etiqueta('Intermediario: se queda con parte del precio', 'inter', 'aviso');
  eInter.position.set(0, 1.6, 0); inter.add(eInter);

  // ---------- El monolito ----------
  const MW = geo(...LOCALIDADES.Formosa);
  const monolito = new THREE.Group(); monolito.position.copy(MW); escena.add(monolito);
  const eCapital = etiqueta('Formosa capital: el comprador', 'capital', 'aviso');
  eCapital.position.copy(MW).setY(1.4); escena.add(eCapital);
  const resaltables = []; // mallas que se iluminan con el foco
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.08, roughness: 0.6, ...extra });
  const marcar = (malla, foco) => { malla.userData.foco = foco; resaltables.push(malla); return malla; };

  // Base de datos (proceso aparte, pero UNA sola)
  const db = new THREE.Group();
  const cil = marcar(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.1, 40), mat(COL.tierra)), 'db');
  cil.position.y = 0.55; db.add(cil);
  for (const y of [0.37, 0.74]) {
    const banda = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffb08f }));
    banda.rotation.x = Math.PI / 2; banda.position.y = y; db.add(banda);
  }
  const eDb = etiqueta('PostgreSQL: una sola base', 'db', 'fuerte'); eDb.position.set(1.8, 0.6, 0); db.add(eDb);
  monolito.add(db);
  const conector = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), mat(COL.pomelo, { emissiveIntensity: 0.4 }));
  conector.position.y = 1.5; monolito.add(conector);

  const cuerpo = new THREE.Group(); monolito.add(cuerpo);
  const capa = (y, texto, foco) => {
    const g = new THREE.Group(); g.position.y = y; g.userData.y0 = y;
    const losa = marcar(new THREE.Mesh(new THREE.BoxGeometry(3, 0.32, 3), mat(COL.capa)), foco);
    const filo = new THREE.LineSegments(new THREE.EdgesGeometry(losa.geometry), new THREE.LineBasicMaterial({ color: 0x6fa3b0 }));
    const e = etiqueta(texto, 'capas'); e.position.set(-2.2, 0, 0);
    g.add(losa, filo, e); cuerpo.add(g); return g;
  };
  const capaServicios = capa(2.2, 'Servicios: la lógica de negocio', 'servicios');
  const capaRutas = capa(4.2, 'Rutas y controladores (Express)', 'rutas');
  const capaVistas = capa(5.9, 'Vistas EJS: HTML armado en el servidor', 'vistas');

  const modulos = {};
  [['Usuarios', -0.7, -0.7], ['Catálogo', 0.7, -0.7], ['Pedidos', -0.7, 0.7], ['Reportes', 0.7, 0.7]].forEach(([n, x, z], i) => {
    const m = marcar(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 1.15),
      mat(new THREE.Color(COL.pomelo).offsetHSL(0, -0.1 * (i % 2), -0.06 * i).getHex())), 'modulos');
    m.position.set(x, 0.6, z); m.userData.nombre = n;
    const e = etiqueta(n, 'modulos', 'modulo'); e.position.y = 0.7; m.add(e);
    m.userData.color0 = m.material.color.getHex();
    capaServicios.add(m); modulos[n] = m;
  });

  // Carcasa: el "un solo bloque"
  const geoCarcasa = new THREE.BoxGeometry(3.6, 5.6, 3.6);
  const carcasa = new THREE.Mesh(geoCarcasa, new THREE.MeshStandardMaterial({ color: COL.pomelo, transparent: true, opacity: 0.07, depthWrite: false }));
  const aristas = new THREE.LineSegments(new THREE.EdgesGeometry(geoCarcasa), new THREE.LineBasicMaterial({ color: COL.pomelo, transparent: true }));
  const bloque = new THREE.Group(); bloque.position.y = 4.55; bloque.add(carcasa, aristas);
  const eProc = etiqueta('Un solo proceso Node.js', 'proceso', 'fuerte'); eProc.position.set(0, 3.2, 0); bloque.add(eProc);
  cuerpo.add(bloque);
  const luzInterior = new THREE.PointLight(COL.pomelo, 6, 9); luzInterior.position.y = 4; monolito.add(luzInterior);

  // Navegador (el cliente)
  const nav = new THREE.Group(); nav.position.set(0, 9.4, 0); nav.userData.y0 = 9.4;
  const pantalla = marcar(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.08), mat(0xdfe8e3, { emissiveIntensity: 0.25 })), 'navegador');
  const barraNav = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: COL.capa }));
  barraNav.position.y = 0.56;
  const eNav = etiqueta('Navegador de Laura', 'navegador'); eNav.position.y = 1.05;
  nav.add(pantalla, barraNav, eNav); monolito.add(nav);

  // Copias para explicar el escalado (límites)
  const copias = [-5.2, 5.2].map((dx, i) => {
    const c = new THREE.Group(); c.position.set(MW.x + dx, 0, MW.z - 1.5);
    const cc = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6, 7, 3.6)),
      new THREE.LineBasicMaterial({ color: COL.pomelo, transparent: true, opacity: 0.6 }));
    cc.position.y = 3.5;
    const e = etiqueta(`Copia ${i + 2}: todo el sistema otra vez`, 'copias'); e.position.y = 7.6;
    const fantasma = new THREE.MeshBasicMaterial({ color: COL.pomelo, transparent: true, opacity: 0.18 });
    for (const y of [3.0, 4.2, 5.9]) { const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), fantasma); l.position.y = y; c.add(l); }
    const mods = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 2.4), fantasma); mods.position.y = 2.7; c.add(mods);
    c.add(cc, e); c.scale.y = 0.001; escena.add(c); return c;
  });
  const balanceador = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1), mat(COL.monte, { emissiveIntensity: 0.4 }));
  balanceador.position.set(MW.x, 11.5, MW.z - 0.7); balanceador.scale.setScalar(0.001);
  const eBal = etiqueta('Balanceador de carga', 'copias'); eBal.position.y = 0.6; balanceador.add(eBal);
  escena.add(balanceador);
  const cables = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    ...[-5.2, 0, 5.2].flatMap((dx) => [balanceador.position.clone(), new THREE.Vector3(MW.x + dx, 7.2, MW.z - (dx ? 1.5 : 0))]),
  ]), new THREE.LineDashedMaterial({ color: COL.monte, dashSize: 0.3, gapSize: 0.2 }));
  cables.computeLineDistances(); escena.add(cables);

  // ---------- Partículas (pedidos viajando) ----------
  const geoPart = new THREE.SphereGeometry(0.13, 10, 8);
  const particulas = Array.from({ length: 60 }, () => {
    const m = new THREE.Mesh(geoPart, new THREE.MeshBasicMaterial({ color: COL.pomelo, transparent: true }));
    m.visible = false; escena.add(m);
    return { m, tramos: [], t: 0, vel: 0, activa: false };
  });
  const arco = (a, b, alto = 3) => new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(Math.max(a.y, b.y) + alto), b);
  const entradaMonolito = () => MW.clone().setY(7.6 + explotar * 2.4);
  function lanzar() {
    const p = particulas.find((q) => !q.activa);
    if (!p || !estado.flujo) return;
    const pin = pines[Math.floor(Math.random() * pines.length)];
    p.tramos = estado.flujo === 'intermediario'
      ? [arco(pin.salida, posInter, 2.5), arco(posInter, MW.clone().setY(1), 1.5)]
      : [arco(pin.salida, entradaMonolito(), 3.5)];
    Object.assign(p, { t: 0, vel: (reducir ? 0.18 : 0.32) + Math.random() * 0.15, activa: true });
    p.m.material.color.setHex(COL.pomelo); p.m.scale.setScalar(1); p.m.visible = true;
  }

  // ---------- Recorrido de un pedido ----------
  const L = (x, y, z) => () => monolito.localToWorld(new THREE.Vector3(x, y, z));
  const posModulo = (n) => () => modulos[n].getWorldPosition(new THREE.Vector3());
  const FASES = [
    { a: L(0, 9.4, 0), foco: 'navegador' },
    { a: () => capaRutas.getWorldPosition(new THREE.Vector3()), foco: 'rutas' },
    { a: posModulo('Pedidos'), foco: 'Pedidos' },
    { a: L(0, 0.6, 0), foco: 'db' },
    { a: posModulo('Pedidos'), foco: 'Pedidos' },
    { a: () => capaVistas.getWorldPosition(new THREE.Vector3()), foco: 'vistas' },
    { a: L(0, 9.4, 0), foco: 'navegador' },
  ];
  const viajero = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const rastro = Array.from({ length: 10 }, (_, i) => {
    const m = new THREE.Mesh(geoPart, new THREE.MeshBasicMaterial({ color: COL.pomelo, transparent: true, opacity: 1 - i / 10 }));
    escena.add(m); return m;
  });
  escena.add(viajero);
  const historial = [];
  let rec = { fase: 0, t: 0, pausa: 0 };

  // ---------- Estado objetivo (lo controla la guía) ----------
  let estado = { camara: 'general', flujo: 'directo', monolito: true, intermediario: false, explotar: 0,
    etiquetas: modo === 'portada' ? ['rios', 'proceso'] : ['pines', 'rios', 'proceso', 'db'], foco: [], recorrido: false, limites: false, orbita: modo === 'portada' };
  let explotar = 0, limitesT = 0, focoActual = null;

  const CAM = {
    general: [[0, 22, 27], [0, 0, -1.5]],
    problema: [[-3, 17, 22], [1, 0, -0.5]],
    portada: [[-2, 19, 28], [3, 1.5, 1]],
    propuesta: [[-2, 16, 23], [2.5, 2, 0]],
    bloque: [[10, 8, 14], [0, 4.6, 0], true],
    capas: [[13, 9, 16], [0, 6.2, 0], true],
    modulos: [[6.5, 7.5, 8.5], [0, 2.9, 0], true],
    db: [[5.5, 4.2, 7.5], [0, 1.3, 0], true],
    recorrido: [[13, 9, 16], [0, 5.8, 0], true],
    demo: [[12, 9, 16], [0, 4.6, 0], true],
    limites: [[0, 11, 25], [0, 5.5, -1], true],
    cierre: [[-4, 27, 31], [0, 0, -2]],
  };
  const camObjetivo = new THREE.Vector3(), mirarObjetivo = new THREE.Vector3();
  let moviendo = false;
  function apuntar(nombre) {
    const [p, t, rel] = CAM[nombre] || CAM.general;
    camObjetivo.set(...p); mirarObjetivo.set(...t);
    if (rel) { camObjetivo.add(MW); mirarObjetivo.add(MW); }
    // Pantalla vertical (celular): alejar la cámara para que entre todo
    const aspecto = ancho() / alto();
    if (aspecto < 1) camObjetivo.sub(mirarObjetivo).multiplyScalar(1 + (1 - aspecto) * 1.1).add(mirarObjetivo);
    moviendo = true;
    if (reducir) { camara.position.copy(camObjetivo); controles.target.copy(mirarObjetivo); moviendo = false; }
  }

  function setEstado(nuevo) {
    estado = { ...estado, ...nuevo };
    if (nuevo.camara) apuntar(estado.camara);
    if (nuevo.recorrido) { rec = { fase: 0, t: 0, pausa: 0.6 }; historial.length = 0; }
    if ('limites' in nuevo) limitesT = 0;
    controles.autoRotate = estado.orbita && !reducir;
    controles.autoRotateSpeed = modo === 'portada' ? 0.6 : 0.4;
    for (const e of listaEtiquetas) e.element.classList.toggle('oculta', !estado.etiquetas.includes(e.userData.grupo));
    nav.visible = estado.recorrido || estado.etiquetas.includes('navegador');
  }

  // ---------- Bucle ----------
  const reloj = new THREE.Timer();
  let ultimoLanz = 0, idAnim;
  const suave = (k, dt) => 1 - Math.exp(-k * dt);

  function cuadro(ms) {
    idAnim = requestAnimationFrame(cuadro);
    reloj.update(ms);
    const dt = Math.min(reloj.getDelta(), 0.05), t = reloj.getElapsed();

    if (moviendo) {
      camara.position.lerp(camObjetivo, suave(2.4, dt));
      controles.target.lerp(mirarObjetivo, suave(2.4, dt));
      if (camara.position.distanceTo(camObjetivo) < 0.05) moviendo = false;
    }
    controles.enabled = !moviendo;
    controles.update();

    // Aparición del monolito y del intermediario
    monolito.scale.y += ((estado.monolito ? 1 : 0.001) - monolito.scale.y) * suave(3, dt);
    monolito.visible = monolito.scale.y > 0.01;
    const si = estado.intermediario ? 1 : 0.001;
    inter.scale.setScalar(inter.scale.x + (si - inter.scale.x) * suave(4, dt));
    inter.visible = inter.scale.x > 0.02; inter.rotation.y += dt * 0.6;

    // Vista explotada de capas
    explotar += (estado.explotar - explotar) * suave(3, dt);
    capaRutas.position.y = capaRutas.userData.y0 + explotar * 1.3;
    capaVistas.position.y = capaVistas.userData.y0 + explotar * 2.6;
    nav.position.y = nav.userData.y0 + explotar * 2.6;
    carcasa.material.opacity = 0.07 * (1 - explotar);
    bloque.scale.y = 1 + explotar * 0.45; bloque.position.y = 4.55 + explotar * 1.3;

    // Foco: ilumina lo que se está explicando
    const focos = estado.recorrido && focoActual ? [focoActual] : estado.foco;
    for (const m of resaltables) {
      const activo = focos.includes(m.userData.foco) || focos.includes(m.userData.nombre);
      const meta = activo ? 0.85 + Math.sin(t * 4) * 0.15 : 0.08;
      m.material.emissiveIntensity += (meta - m.material.emissiveIntensity) * suave(6, dt);
    }

    // Límites: aparecen copias y luego falla un módulo
    let rojo = false;
    if (estado.limites) {
      limitesT += dt;
      const s = Math.min(1, limitesT / 1.2);
      copias.forEach((c) => { c.scale.y += (s - c.scale.y) * suave(4, dt); });
      balanceador.scale.setScalar(balanceador.scale.x + (s - balanceador.scale.x) * suave(4, dt));
      rojo = limitesT % 9 > 4.5;
    } else {
      copias.forEach((c) => { c.scale.y += (0.001 - c.scale.y) * suave(4, dt); });
      balanceador.scale.setScalar(Math.max(0.001, balanceador.scale.x + (0.001 - balanceador.scale.x) * suave(4, dt)));
    }
    copias.forEach((c) => { c.visible = c.scale.y > 0.02; });
    balanceador.visible = cables.visible = balanceador.scale.x > 0.5;
    const rep = modulos.Reportes.material;
    rep.color.setHex(rojo ? COL.error : modulos.Reportes.userData.color0);
    rep.emissive.copy(rep.color);
    const parpadeo = rojo && Math.sin(t * 18) > 0;
    aristas.material.color.setHex(rojo ? COL.error : COL.pomelo);
    aristas.material.opacity = parpadeo ? 0.2 : 1;
    luzInterior.color.setHex(rojo ? COL.error : COL.pomelo);
    luzInterior.intensity = parpadeo ? 1 : 6;
    eProc.element.textContent = rojo ? 'Falla Reportes: se reinicia TODO el proceso' : 'Un solo proceso Node.js';
    eProc.element.classList.toggle('alerta', rojo);

    // Pines que laten
    for (const p of pines) {
      const k = ((t + p.fase) % 2) / 2;
      p.anillo.scale.setScalar(1 + k * 2.2); p.anillo.material.opacity = 1 - k;
    }

    // Partículas
    if (estado.flujo && t - ultimoLanz > (reducir ? 0.9 : 0.28)) { lanzar(); ultimoLanz = t; }
    for (const p of particulas) {
      if (!p.activa) continue;
      p.t += dt * p.vel;
      const i = Math.min(Math.floor(p.t), p.tramos.length - 1);
      if (p.t >= p.tramos.length) { p.activa = false; p.m.visible = false; continue; }
      p.m.position.copy(p.tramos[i].getPoint(p.t - i));
      if (p.tramos.length === 2 && i === 1) { p.m.material.color.setHex(COL.gris); p.m.scale.setScalar(0.6); }
      p.m.material.opacity = Math.min(1, (p.tramos.length - p.t) * 4);
    }

    // Recorrido del pedido
    viajero.visible = estado.recorrido;
    rastro.forEach((m) => { m.visible = estado.recorrido; });
    if (estado.recorrido) {
      if (rec.pausa > 0) rec.pausa -= dt;
      else {
        rec.t += dt * (reducir ? 0.5 : 0.9);
        if (rec.t >= 1) {
          rec.t = 0; rec.fase++;
          if (rec.fase >= FASES.length - 1) { rec.fase = 0; rec.pausa = 1.6; }
        }
      }
      const a = FASES[rec.fase].a(), b = FASES[rec.fase + 1].a();
      viajero.position.copy(a).lerp(b, THREE.MathUtils.smoothstep(rec.t, 0, 1));
      const foco = rec.pausa > 0 ? FASES[0].foco : FASES[rec.fase + 1].foco;
      focoActual = foco;
      const indice = rec.pausa > 0 ? 0 : rec.fase + 1;
      if (indice !== rec.avisado) { rec.avisado = indice; onFase(indice); }
      historial.unshift(viajero.position.clone()); historial.length = Math.min(historial.length, 40);
      rastro.forEach((m, i) => { const h = historial[i * 4]; if (h) m.position.copy(h); });
    } else focoActual = null;

    renderer.render(escena, camara);
    etiquetas.render(escena, camara);
  }

  // Corre el centro de la imagen: en la guía deja lugar al panel; en la portada, al título
  function encuadre() {
    const w = ancho(), h = alto();
    camara.aspect = w / h;
    let dx = 0, dy = 0;
    if (modo === 'guia' && w > 760) dx = (Math.min(420, w - 36) + 18) / 2;
    if (modo === 'guia' && w <= 760) dy = h * 0.15; // el panel ocupa la mitad de abajo
    if (modo === 'portada' && w > 900) dx = -w * 0.16;
    if (dx || dy) camara.setViewOffset(w, h, dx, dy, w, h); else camara.clearViewOffset();
    camara.updateProjectionMatrix();
  }
  encuadre();
  const ro = new ResizeObserver(() => {
    renderer.setSize(ancho(), alto()); etiquetas.setSize(ancho(), alto());
    encuadre();
  });
  ro.observe(contenedor);
  apuntar(modo === 'portada' ? 'portada' : 'general');
  camara.position.copy(camObjetivo).add(new THREE.Vector3(0, 6, 8)); // entrada: baja hacia la provincia
  setEstado({});
  requestAnimationFrame(cuadro);

  return {
    setEstado,
    destruir() { cancelAnimationFrame(idAnim); ro.disconnect(); renderer.dispose(); contenedor.innerHTML = ''; },
  };
}

export function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
