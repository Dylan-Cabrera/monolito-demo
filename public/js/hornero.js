// Portada: un hornero (Furnarius rufus) frente a su nido de barro, sobre un poste de alambrado.
import * as THREE from 'three';

const C = {
  barro: 0x8a6748, barroOscuro: 0x5e4330, liquen: 0xd9d4c7, madera: 0x6e5440, maderaClara: 0x8c7056,
  lomo: 0xa5653b, corona: 0x8b5634, pecho: 0xe0b487, garganta: 0xf2dfc4, cola: 0xb9552b,
  pico: 0x3e3631, patas: 0x9a948c, hueco: 0x140d08, alambre: 0x9fb1b4,
};

// Ruido simple y determinista para dar textura al barro y a la madera
function ruido(x, y, z) {
  return (Math.sin(x * 3.1 + y * 1.7) * Math.cos(z * 2.3 - x * 1.3) + Math.sin(y * 4.7 + z * 3.9) * 0.5 +
    Math.sin((x + z) * 7.3) * 0.25) / 1.75;
}

export function crearHornero(contenedor) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ancho = () => contenedor.clientWidth, alto = () => contenedor.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(ancho(), alto());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(0x2b4a52, 18, 60);
  const camara = new THREE.PerspectiveCamera(32, ancho() / alto(), 0.1, 200);
  const camBase = new THREE.Vector3(0.8, 2.6, 16), mira = new THREE.Vector3(0, 1.75, 0);

  // Luz de amanecer: sol cálido detrás a la derecha + cielo frío
  escena.add(new THREE.HemisphereLight(0xbfd6dc, 0x4a3526, 1.25));
  const sol = new THREE.DirectionalLight(0xffc98a, 2.6);
  sol.position.set(6, 7, -3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
  sol.shadow.bias = -0.002;
  escena.add(sol);
  const relleno = new THREE.DirectionalLight(0x9cc3cf, 1.25);
  relleno.position.set(-5, 3, 8); escena.add(relleno);

  // ---------- Poste y alambrado ----------
  const conRuido = (geo, k, amp) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = ruido(x * k, y * k, z * k) * amp;
      p.setXYZ(i, x + n * Math.sign(x || 1) * 0.5, y, z + n * Math.sign(z || 1) * 0.5);
    }
    geo.computeVertexNormals(); return geo;
  };
  const matMadera = new THREE.MeshStandardMaterial({ color: C.madera, roughness: 0.95, flatShading: true });
  const poste = new THREE.Mesh(conRuido(new THREE.BoxGeometry(1.25, 7, 1.15, 3, 14, 3), 1.4, 0.08), matMadera);
  poste.position.y = -3.6; poste.castShadow = poste.receiveShadow = true;
  escena.add(poste);
  const travesano = new THREE.Mesh(conRuido(new THREE.BoxGeometry(14, 0.32, 0.45, 40, 1, 1), 0.9, 0.05),
    new THREE.MeshStandardMaterial({ color: C.maderaClara, roughness: 0.9, flatShading: true }));
  travesano.position.set(0, -0.35, 0.75); travesano.receiveShadow = true; escena.add(travesano);

  // Alambres y postes que se pierden en el horizonte
  const matAlambre = new THREE.LineBasicMaterial({ color: C.alambre, transparent: true, opacity: 0.55 });
  for (const y of [-1.4, -2.3]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = -30 + i * 1.5, z = -0.2 - Math.max(0, x) * 0.9;
      pts.push(new THREE.Vector3(x, y - Math.sin((i % 8) / 8 * Math.PI) * 0.12, z));
    }
    escena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matAlambre));
  }
  for (let i = 1; i <= 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 0.35), matMadera);
    p.position.set(i * 4.2, -3.2, -0.2 - i * 4.2 * 0.9); escena.add(p);
  }

  // ---------- Nido de barro ----------
  const nido = new THREE.Group();
  nido.rotation.y = -0.42; // la boca mira de costado a la cámara, como en la foto
  escena.add(nido);
  const geoNido = new THREE.SphereGeometry(1.5, 72, 48);
  const pos = geoNido.attributes.position, colores = [];
  const boca = new THREE.Vector3(0.18, -0.05, 1).normalize();
  const tmp = new THREE.Vector3(), col = new THREE.Color(), tmpCol = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const dir = tmp.clone().normalize();
    let r = 1 + ruido(dir.x * 3, dir.y * 3, dir.z * 3) * 0.045 + ruido(dir.x * 11, dir.y * 11, dir.z * 11) * 0.015;
    const cerca = dir.dot(boca);                 // entrada: cráter hacia adentro con labio
    if (cerca > 0.86) r -= (cerca - 0.86) * 4.2;
    else if (cerca > 0.78) r += (cerca - 0.78) * 0.5;
    tmp.copy(dir).multiplyScalar(1.5 * r);
    tmp.x *= 1.28; tmp.y *= 0.92;               // forma de horno, más ancha que alta
    if (tmp.y < -0.95) tmp.y = -0.95 + (tmp.y + 0.95) * 0.08; // base apoyada en el poste
    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    // líquenes blanquecinos en un costado (como en la foto), con borde suave
    const liquen = THREE.MathUtils.smoothstep(dir.x, 0.25, 0.7) * THREE.MathUtils.smoothstep(ruido(dir.x * 5, dir.y * 7, dir.z * 5), 0.1, 0.65);
    col.setHex(C.barro).lerp(tmpCol.setHex(C.liquen), liquen * 0.75).offsetHSL(0, 0, ruido(dir.x * 17, dir.y * 17, dir.z * 17) * 0.05);
    if (cerca > 0.86) col.setHex(C.barroOscuro);
    colores.push(col.r, col.g, col.b);
  }
  geoNido.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geoNido.computeVertexNormals();
  const cascara = new THREE.Mesh(geoNido, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  cascara.castShadow = cascara.receiveShadow = true;
  nido.add(cascara);
  // Oscuridad del interior
  const hueco = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ color: C.hueco }));
  hueco.scale.set(1.0, 1.15, 1);
  const centroBoca = boca.clone().multiplyScalar(1.5 * 0.62);
  centroBoca.x *= 1.28; centroBoca.y *= 0.92;
  hueco.position.copy(centroBoca); hueco.lookAt(centroBoca.clone().add(boca));
  nido.add(hueco);
  nido.position.y = 0.95;

  // ---------- El hornero ----------
  const ave = new THREE.Group();          // pivote en las patas; mira hacia +x
  const cuerpo = new THREE.Group(); ave.add(cuerpo);
  const m = (c, extra) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...extra });
  const elipse = (r, sx, sy, sz, mat) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat); e.scale.set(sx, sy, sz); e.castShadow = true; return e; };

  const torso = elipse(0.42, 1.38, 0.95, 0.85, m(C.lomo)); torso.position.set(0, 0.78, 0); torso.rotation.z = 0.32;
  const pecho = elipse(0.36, 1.1, 0.95, 0.8, m(C.pecho)); pecho.position.set(0.17, 0.66, 0); pecho.rotation.z = 0.5;
  cuerpo.add(torso, pecho);
  for (const s of [1, -1]) {                 // alas
    const ala = elipse(0.33, 1.6, 0.62, 0.3, m(0x8f5432)); ala.position.set(-0.12, 0.84, s * 0.29); ala.rotation.set(s * 0.15, 0, 0.2);
    ala.userData.lado = s; cuerpo.add(ala); (cuerpo.userData.alas ||= []).push(ala);
  }
  const cola = new THREE.Group(); cola.position.set(-0.48, 0.72, 0); cuerpo.add(cola);
  const plumas = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.26), m(C.cola)); plumas.position.x = -0.3; plumas.castShadow = true;
  cola.add(plumas); cola.rotation.z = 0.3;

  const cabeza = new THREE.Group(); cabeza.position.set(0.48, 1.12, 0); cuerpo.add(cabeza);
  cabeza.add(elipse(0.25, 1.1, 1, 0.95, m(C.corona)));
  const garganta = elipse(0.16, 1.1, 1, 1, m(C.garganta)); garganta.position.set(0.12, -0.1, 0); cabeza.add(garganta);
  const picoSup = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 10), m(C.pico, { roughness: 0.5 }));
  picoSup.rotation.z = -Math.PI / 2 - 0.1; picoSup.position.set(0.42, -0.02, 0); cabeza.add(picoSup);
  const mandibula = new THREE.Group(); mandibula.position.set(0.22, -0.05, 0); cabeza.add(mandibula);
  const picoInf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.36, 8), m(0x5a504a));
  picoInf.rotation.z = -Math.PI / 2 - 0.05; picoInf.position.x = 0.18; mandibula.add(picoInf);
  for (const s of [1, -1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), m(0x0e0a08, { roughness: 0.2 }));
    ojo.position.set(0.1, 0.05, s * 0.22); cabeza.add(ojo);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    brillo.position.set(0.13, 0.075, s * 0.255); cabeza.add(brillo);
    const ceja = elipse(0.07, 1.8, 0.4, 0.4, m(0xc99566)); ceja.position.set(0.04, 0.12, s * 0.2); cabeza.add(ceja);
  }
  for (const s of [1, -1]) {                 // patas largas
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.45, 6), m(C.patas));
    pata.position.set(0.05, 0.22, s * 0.11); pata.rotation.z = -0.1; ave.add(pata);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.05), m(C.patas)); pie.position.set(0.09, 0.01, s * 0.11); ave.add(pie);
  }
  ave.scale.setScalar(0.92);
  escena.add(ave);

  // Posaderos (en coordenadas del mundo)
  nido.updateMatrixWorld(true);
  const enNido = (x, y, z) => nido.localToWorld(new THREE.Vector3(x, y, z));
  const P = {
    techo: { p: enNido(-0.35, 1.36, 0.05), giro: Math.PI * 0.92 },          // arriba, mirando a la izquierda (como la foto)
    boca: { p: enNido(centroBoca.x + 0.1, -0.74, 1.32), giro: 0 },          // sobre el labio de la entrada
    varilla: { p: new THREE.Vector3(-2.6, -0.19, 0.75), giro: -0.25 },      // en el travesaño, mirando al nido
  };

  { // en la boca mira hacia adentro del nido, de tres cuartos para que se vea el perfil
    const d = enNido(centroBoca.x, centroBoca.y, 0).sub(P.boca.p);
    P.boca.giro = Math.atan2(-d.z, d.x) + 0.55;
  }

  // ---------- Notas del canto ----------
  const notas = Array.from({ length: 14 }, () => {
    const s = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 14), new THREE.MeshBasicMaterial({ color: 0xf4b13e, transparent: true }));
    s.visible = false; escena.add(s); return { s, t: 0, v: new THREE.Vector3() };
  });
  const lanzarNota = () => {
    const n = notas.find((q) => !q.s.visible); if (!n) return;
    picoSup.getWorldPosition(n.s.position);
    n.v.set((Math.random() - 0.3) * 0.6, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
    n.t = 0; n.s.visible = true;
  };

  // Polen / polvo flotando a contraluz
  const nPolvo = 160, polvo = new Float32Array(nPolvo * 3);
  for (let i = 0; i < nPolvo; i++) polvo.set([(Math.random() - 0.5) * 16, Math.random() * 7 - 2, (Math.random() - 0.5) * 8 - 1], i * 3);
  const geoPolvo = new THREE.BufferGeometry(); geoPolvo.setAttribute('position', new THREE.BufferAttribute(polvo, 3));
  escena.add(new THREE.Points(geoPolvo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false })));

  // ---------- Guion del ave ----------
  // idle: mira alrededor; canta: abre el pico y suelta notas; salta: arco entre posaderos; asoma: mete la cabeza en el nido
  const GUION = reducir
    ? [['idle', 6, 'techo']]
    : [['idle', 2.6, 'techo'], ['canta', 2.4, 'techo'], ['idle', 1.4, 'techo'], ['salta', 0.75, 'boca'], ['asoma', 2.6, 'boca'],
       ['salta', 0.85, 'varilla'], ['idle', 1.6, 'varilla'], ['canta', 2.2, 'varilla'], ['salta', 0.9, 'techo']];
  let paso = 0, tPaso = 0, desde = P.techo, hacia = P.techo, mirarObj = 0, mirarT = 0;
  ave.position.copy(P.techo.p); ave.rotation.y = P.techo.giro;
  const angulo = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

  const puntero = new THREE.Vector2();
  const alMover = (e) => { puntero.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); };
  addEventListener('pointermove', alMover);

  const reloj = new THREE.Timer();
  let id;
  function cuadro(ms) {
    id = requestAnimationFrame(cuadro);
    reloj.update(ms);
    const dt = Math.min(reloj.getDelta(), 0.05), t = reloj.getElapsed();

    // cámara con paralaje suave
    camara.position.lerp(tmp.set(camBase.x + puntero.x * 1.2, camBase.y - puntero.y * 0.6, camBase.z), 1 - Math.exp(-2 * dt));
    camara.lookAt(mira);

    const [accion, dur, destino] = GUION[paso];
    tPaso += dt;
    const k = Math.min(1, tPaso / dur);
    const alas = cuerpo.userData.alas;

    cuerpo.scale.y = 1 + Math.sin(t * 3.2) * 0.015;            // respira
    let picoAbierto = 0, inclinacion = 0, alaAbierta = 0;

    if (accion === 'salta') {
      const a = desde.p, b = hacia.p;
      ave.position.lerpVectors(a, b, k);
      ave.position.y += Math.sin(k * Math.PI) * (0.9 + Math.abs(a.y - b.y) * 0.3);
      const rumbo = Math.atan2(-(b.z - a.z), b.x - a.x);
      ave.rotation.y = angulo(ave.rotation.y, k < 0.8 ? rumbo : hacia.giro, 1 - Math.exp(-14 * dt));
      alaAbierta = Math.abs(Math.sin(t * 38)) * 0.9 + 0.3;
      inclinacion = -0.15;
    } else {
      ave.rotation.y = angulo(ave.rotation.y, hacia.giro, 1 - Math.exp(-6 * dt));
      if (accion === 'idle') {
        if (t > mirarT) { mirarObj = (Math.random() - 0.5) * 1.6; mirarT = t + 0.6 + Math.random() * 1.2; }
        cola.rotation.z = 0.3 + Math.max(0, Math.sin(t * 2.3)) ** 8 * 0.5;   // golpes de cola
      }
      if (accion === 'canta') {
        mirarObj = 0;
        picoAbierto = Math.max(0, Math.sin(t * 22)) * 0.45;
        inclinacion = 0.35;                                       // cabeza arriba al cantar
        alaAbierta = 0.25 + Math.max(0, Math.sin(t * 11)) * 0.35; // aletea como en el dúo del hornero
        if (Math.random() < dt * 7) lanzarNota();
      }
      if (accion === 'asoma') { mirarObj = 0; inclinacion = -0.55 * Math.sin(Math.min(1, k * 1.4) * Math.PI); }
    }
    cabeza.rotation.y += (mirarObj - cabeza.rotation.y) * (1 - Math.exp(-9 * dt));
    cuerpo.rotation.z += (inclinacion - cuerpo.rotation.z) * (1 - Math.exp(-8 * dt));
    mandibula.rotation.z = -picoAbierto;
    for (const a of alas) a.rotation.x = a.userData.lado * (0.15 + alaAbierta);

    if (k >= 1) {
      paso = (paso + 1) % GUION.length; tPaso = 0;
      const sig = GUION[paso];
      desde = hacia; hacia = P[sig[2]];
      if (sig[0] !== 'salta') ave.position.copy(hacia.p);
    }

    for (const n of notas) {
      if (!n.s.visible) continue;
      n.t += dt; n.s.position.addScaledVector(n.v, dt); n.s.rotation.y += dt * 3;
      n.s.material.opacity = 1 - n.t / 1.8; if (n.t > 1.8) n.s.visible = false;
    }
    const pp = geoPolvo.attributes.position;
    for (let i = 0; i < nPolvo; i++) {
      let y = pp.getY(i) + dt * 0.12; if (y > 5) y = -2;
      pp.setY(i, y); pp.setX(i, pp.getX(i) + Math.sin(t * 0.5 + i) * dt * 0.05);
    }
    pp.needsUpdate = true;
    renderer.render(escena, camara);
  }

  function encuadre() {
    const w = ancho(), h = alto();
    camara.aspect = w / h;
    // en pantallas anchas el nido va a la derecha; en celular, arriba del texto
    if (w > 900) camara.setViewOffset(w, h, -w * 0.21, -h * 0.04, w, h);
    else camara.setViewOffset(w, h, 0, h * 0.2, w, h);
    camara.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(encuadre); ro.observe(contenedor);
  encuadre();
  camara.position.copy(camBase);
  requestAnimationFrame(cuadro);

  return { destruir() { cancelAnimationFrame(id); ro.disconnect(); removeEventListener('pointermove', alMover); renderer.dispose(); contenedor.innerHTML = ''; } };
}

export function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
