import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ */
/*  OCTANT 01 — procedural watch. No model file, no textures on disk.  */
/*  Built face-on (+Z); the teardown explodes along Z and is shot side- */
/*  on so the layers separate horizontally on screen.                   */
/* ------------------------------------------------------------------ */

const BRASS = 0xc29a5d;

function ring(outer, inner, depth, bevel = 0.035, segments = 128) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: segments,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function dialTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0a0c0e';
  ctx.fillRect(0, 0, S, S);

  const g = ctx.createRadialGradient(S * 0.5, S * 0.44, S * 0.04, S * 0.5, S * 0.5, S * 0.52);
  g.addColorStop(0, '#23282c');
  g.addColorStop(0.55, '#171c1f');
  g.addColorStop(1, '#0d1114');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();

  // sunburst
  ctx.save();
  ctx.translate(S / 2, S / 2);
  for (let i = 0; i < 480; i++) {
    ctx.rotate((Math.PI * 2) / 480);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -S / 2);
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.024)' : 'rgba(255,255,255,0.007)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();

  // minute track
  ctx.save();
  ctx.translate(S / 2, S / 2);
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    ctx.save();
    ctx.rotate((i / 60) * Math.PI * 2);
    ctx.fillStyle = major ? 'rgba(240,236,226,0.9)' : 'rgba(240,236,226,0.42)';
    if (major) ctx.fillRect(-2.6, -S * 0.457, 5.2, 24);
    else ctx.fillRect(-1.2, -S * 0.452, 2.4, 12);
    ctx.restore();
  }
  ctx.restore();

  // print
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ece6d8';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
  ctx.font = '600 42px "Archivo Variable", Archivo, Helvetica, sans-serif';
  ctx.fillText('OCTANT', S / 2, S * 0.295);

  ctx.fillStyle = 'rgba(236,230,216,0.66)';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '7px';
  ctx.font = '400 17px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText('AUTOMÁTICO', S / 2, S * 0.345);

  ctx.fillStyle = 'rgba(236,230,216,0.62)';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.font = '400 19px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText('CAL. 8   ·   72 H', S / 2, S * 0.695);
  ctx.fillText('316L   ·   100 M', S / 2, S * 0.728);

  // 12 o'clock red pip
  ctx.fillStyle = '#ff3b1e';
  ctx.fillRect(S / 2 - 13, S * 0.395, 26, 3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function stripeTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8d6d3c';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(255,230,180,0.30)';
  ctx.lineWidth = 2;
  for (let i = -S; i < S * 2; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function handShape(length, width, tail) {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.5, -tail);
  s.lineTo(width * 0.5, -tail);
  s.lineTo(width * 0.34, length * 0.9);
  s.lineTo(0, length);
  s.lineTo(-width * 0.34, length * 0.9);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  return g;
}

function wheelGeometry(radius, thickness, teeth = 22) {
  const parts = [];
  const band = new THREE.TorusGeometry(radius, thickness * 0.42, 7, 56);
  parts.push(band);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new THREE.BoxGeometry(0.045, 0.075, thickness * 0.62);
    t.translate(radius + 0.035, 0, 0);
    t.rotateZ(a);
    parts.push(t);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.BoxGeometry(radius * 0.92, 0.055, thickness * 0.4);
    s.translate(radius * 0.47, 0, 0);
    s.rotateZ(a);
    parts.push(s);
  }
  const hub = new THREE.CylinderGeometry(0.085, 0.085, thickness * 1.5, 20);
  hub.rotateX(Math.PI / 2);
  parts.push(hub);
  return mergeGeometries(parts, false);
}

export function buildWatch() {
  const root = new THREE.Group(); // turntable (world Y)
  const tilt = new THREE.Group(); // face-on, slight tilt
  root.add(tilt);

  const mats = {
    steel: new THREE.MeshPhysicalMaterial({
      color: 0xb8bfc5, metalness: 1, roughness: 0.34, envMapIntensity: 0.95,
    }),
    steelPolished: new THREE.MeshPhysicalMaterial({
      color: 0xd2d7db, metalness: 1, roughness: 0.13, envMapIntensity: 1.15,
    }),
    bezel: new THREE.MeshPhysicalMaterial({
      color: 0xc6cbcf, metalness: 1, roughness: 0.15, envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    }),
    steelBrushed: new THREE.MeshPhysicalMaterial({
      color: 0x9aa1a7, metalness: 1, roughness: 0.5, envMapIntensity: 0.85,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x24282c, metalness: 0.9, roughness: 0.32, envMapIntensity: 1,
    }),
    brass: new THREE.MeshPhysicalMaterial({
      color: BRASS, metalness: 1, roughness: 0.34, envMapIntensity: 1.1,
    }),
    brassDark: new THREE.MeshPhysicalMaterial({
      color: 0x94703a, metalness: 1, roughness: 0.42, envMapIntensity: 1,
    }),
    ruby: new THREE.MeshPhysicalMaterial({
      color: 0x8e1226, metalness: 0, roughness: 0.12, clearcoat: 1,
      emissive: 0x2a0208, envMapIntensity: 1.4,
    }),
    lume: new THREE.MeshStandardMaterial({
      color: 0xe9e2cf, roughness: 0.62, emissive: 0x1a1710,
    }),
    red: new THREE.MeshPhysicalMaterial({
      color: 0xff3b1e, metalness: 0.2, roughness: 0.3, clearcoat: 0.8,
      emissive: 0x2a0700,
    }),
    dial: new THREE.MeshPhysicalMaterial({
      map: dialTexture(), metalness: 0.55, roughness: 0.46,
      clearcoat: 0.55, clearcoatRoughness: 0.3, envMapIntensity: 0.9,
    }),
    sapphire: new THREE.MeshPhysicalMaterial({
      color: 0xdfe9f5, metalness: 0, roughness: 0.03, transparent: true,
      opacity: 0.22, depthWrite: false, clearcoat: 1, envMapIntensity: 2,
      side: THREE.DoubleSide,
    }),
    casebackGlass: new THREE.MeshPhysicalMaterial({
      color: 0xcfd8df, metalness: 0, roughness: 0.05, transparent: true,
      opacity: 0.2, depthWrite: false, envMapIntensity: 1.6,
      side: THREE.DoubleSide,
    }),
  };

  const exploded = [];
  function part(obj, dir, order = 0) {
    obj.userData.base = obj.position.clone();
    obj.userData.dir = new THREE.Vector3(...dir);
    obj.userData.order = order;
    exploded.push(obj);
    return obj;
  }

  const meshes = [];
  const addMesh = (geo, mat, parent = tilt) => {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    meshes.push(m);
    return m;
  };

  /* ---------------- case band ---------------- */
  const caseBand = addMesh(ring(1.96, 1.64, 0.86, 0.05), mats.steel);
  caseBand.position.z = -0.1;
  part(caseBand, [0, 0, 0], 0);

  const caseEdgeTop = addMesh(new THREE.TorusGeometry(1.955, 0.028, 8, 128), mats.steelPolished);
  caseEdgeTop.position.z = 0.32;
  const caseEdgeBottom = addMesh(new THREE.TorusGeometry(1.94, 0.03, 8, 128), mats.steelBrushed);
  caseEdgeBottom.position.z = -0.52;

  /* ---------------- bezel + notches ---------------- */
  const bezel = new THREE.Group();
  const bezelPts = [
    new THREE.Vector2(1.6, 0.26),
    new THREE.Vector2(1.62, 0.35),
    new THREE.Vector2(1.7, 0.42),
    new THREE.Vector2(1.8, 0.44),
    new THREE.Vector2(1.9, 0.41),
    new THREE.Vector2(1.968, 0.33),
    new THREE.Vector2(1.986, 0.24),
  ];
  const bezelGeo = new THREE.LatheGeometry(bezelPts, 128);
  bezelGeo.rotateX(Math.PI / 2);
  addMesh(bezelGeo, mats.bezel, bezel);
  const bezelRim = new THREE.Mesh(new THREE.TorusGeometry(1.982, 0.018, 8, 128), mats.steelPolished);
  bezelRim.position.z = 0.29;
  bezel.add(bezelRim);
  const notchGeo = new RoundedBoxGeometry(0.03, 0.075, 0.1, 2, 0.01);
  const notchMat = mats.steelBrushed;
  const notches = new THREE.InstancedMesh(notchGeo, notchMat, 88);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 88; i++) {
    const a = (i / 88) * Math.PI * 2;
    dummy.position.set(Math.sin(a) * 1.985, Math.cos(a) * 1.985, 0.29);
    dummy.rotation.set(0, 0, -a);
    dummy.updateMatrix();
    notches.setMatrixAt(i, dummy.matrix);
  }
  bezel.add(notches);
  bezel.position.z = 0.02;
  tilt.add(bezel);
  part(bezel, [0, 0, 1.55], 0.1);

  /* ---------------- crystal ---------------- */
  const domePoints = [];
  for (let i = 0; i <= 18; i++) {
    const r = (i / 18) * 1.6;
    domePoints.push(new THREE.Vector2(r, 0.075 * (1 - Math.pow(r / 1.6, 2)) + 0.004));
  }
  const domeGeo = new THREE.LatheGeometry(domePoints, 96);
  domeGeo.rotateX(Math.PI / 2);
  const crystal = addMesh(domeGeo, mats.sapphire);
  crystal.position.z = 0.44;
  part(crystal, [0, 0, 2.05], 0.02);

  /* ---------------- dial ---------------- */
  const dial = addMesh(new THREE.CircleGeometry(1.615, 128), mats.dial);
  dial.position.z = 0.19;
  part(dial, [0, 0, 0.6], 0.3);

  // dial plate thickness, so the disk reads in the side-on teardown
  const dialBack = addMesh(new THREE.CylinderGeometry(1.612, 1.612, 0.05, 128), mats.dark);
  dialBack.rotation.x = Math.PI / 2;
  dialBack.position.z = 0.162;
  part(dialBack, [0, 0, 0.6], 0.3);

  // chapter ring
  const rehaut = addMesh(ring(1.645, 1.598, 0.09, 0.004), mats.dark);
  rehaut.position.z = 0.228;

  /* ---------------- applied indices ---------------- */
  const indexGeos = [];
  const lumeGeos = [];
  const pushBaton = (x, y, angle, w, h) => {
    const metal = new THREE.BoxGeometry(w, h, 0.035);
    metal.rotateZ(angle);
    metal.translate(x, y, 0.222);
    indexGeos.push(metal);

    const lume = new THREE.BoxGeometry(w * 0.52, h * 0.72, 0.018);
    lume.rotateZ(angle);
    lume.translate(x, y, 0.242);
    lumeGeos.push(lume);
  };

  const R = 1.36;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.sin(a) * R;
    const y = Math.cos(a) * R;
    if (i === 0) {
      pushBaton(-0.135, y, 0, 0.08, 0.42);
      pushBaton(0.135, y, 0, 0.08, 0.42);
    } else if (i === 3 || i === 6 || i === 9) {
      pushBaton(x, y, -a, 0.11, 0.38);
    } else {
      pushBaton(x, y, -a, 0.07, 0.3);
    }
  }
  const indices = addMesh(mergeGeometries(indexGeos, false), mats.steelPolished);
  part(indices, [0, 0, 0.6], 0.3);
  const indexLume = addMesh(mergeGeometries(lumeGeos, false), mats.lume);
  part(indexLume, [0, 0, 0.6], 0.3);

  /* ---------------- hands ---------------- */
  const hands = new THREE.Group();
  const hourHand = new THREE.Mesh(handShape(0.92, 0.115, 0.16), mats.steelPolished);
  hourHand.position.z = 0.246;
  const minHand = new THREE.Mesh(handShape(1.36, 0.082, 0.18), mats.steelPolished);
  minHand.position.z = 0.276;
  const secHand = new THREE.Mesh(handShape(1.46, 0.026, 0.3), mats.red);
  secHand.position.z = 0.312;
  const hourLume = new THREE.Mesh(handShape(0.72, 0.05, 0), mats.lume);
  hourLume.position.z = 0.031;
  const minLume = new THREE.Mesh(handShape(1.12, 0.034, 0), mats.lume);
  minLume.position.z = 0.031;
  hourHand.add(hourLume);
  minHand.add(minLume);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.055, 28), mats.steelPolished);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.325;
  hands.add(hourHand, minHand, secHand, cap);
  tilt.add(hands);
  part(hands, [0, 0, 0.95], 0.2);

  /* ---------------- crown ---------------- */
  const crown = new THREE.Group();
  const crownBody = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.26, 32), mats.steelPolished);
  crownBody.rotation.z = Math.PI / 2;
  crown.add(crownBody);
  const crownCap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 28), mats.steel);
  crownCap.rotation.z = Math.PI / 2;
  crownCap.position.x = 0.15;
  crown.add(crownCap);
  const ridgeGeo = new THREE.BoxGeometry(0.05, 0.42, 0.16);
  const ridgeCount = 20;
  const ridges = new THREE.InstancedMesh(ridgeGeo, mats.steelBrushed, ridgeCount);
  for (let i = 0; i < ridgeCount; i++) {
    const a = (i / ridgeCount) * Math.PI * 2;
    dummy.position.set(0, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
    dummy.rotation.set(0, 0, 0);
    dummy.rotation.x = -a;
    dummy.scale.set(0.02, 1, 1);
    dummy.updateMatrix();
    ridges.setMatrixAt(i, dummy.matrix);
  }
  crown.add(ridges);
  crown.position.set(1.99, 0, -0.02);
  tilt.add(crown);
  part(crown, [0, 0, 0], 0);
  crown.userData.dir.set(0.9, 0, 0);

  /* ---------------- caseback ---------------- */
  const caseback = new THREE.Group();
  const cbRing = new THREE.Mesh(ring(1.93, 1.3, 0.12, 0.03), mats.steelBrushed);
  caseback.add(cbRing);
  const cbGlass = new THREE.Mesh(new THREE.CircleGeometry(1.29, 96), mats.casebackGlass);
  cbGlass.position.z = -0.065;
  cbGlass.rotation.y = Math.PI;
  caseback.add(cbGlass);
  const cbInner = new THREE.Mesh(new THREE.TorusGeometry(1.31, 0.035, 8, 96), mats.steelPolished);
  caseback.add(cbInner);
  caseback.position.z = -0.54;
  caseback.rotation.y = Math.PI;
  tilt.add(caseback);
  part(caseback, [0, 0, -2.5], 0.55);

  /* ---------------- lugs + bracelet ---------------- */
  const lugsGeos = [];
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const g = new RoundedBoxGeometry(0.34, 0.72, 0.26, 3, 0.07);
      g.rotateX(sy * -0.34);
      g.translate(sx * 0.63, sy * 1.83, -0.05);
      lugsGeos.push(g);
    }
  }
  addMesh(mergeGeometries(lugsGeos, false), mats.steel);

  function buildStrap(sign) {
    const outer = [];
    const center = [];
    for (let i = 0; i < 18; i++) {
      const y = sign * (2.12 + i * 0.185);
      const z = -0.2 - i * i * 0.012;
      const tiltX = sign * -i * 0.03;
      const w = 1.44 - i * 0.028;

      const cg = new RoundedBoxGeometry(w * 0.46, 0.178, 0.17, 2, 0.022);
      cg.rotateX(tiltX);
      cg.translate(0, y, z + 0.006);
      center.push(cg);

      for (const sx of [-1, 1]) {
        const og = new RoundedBoxGeometry(w * 0.28, 0.172, 0.16, 2, 0.02);
        og.rotateX(tiltX);
        og.translate(sx * w * 0.355, y, z - 0.005);
        outer.push(og);
      }
    }
    const g1 = new THREE.Group();
    g1.add(new THREE.Mesh(mergeGeometries(outer, false), mats.steelBrushed));
    g1.add(new THREE.Mesh(mergeGeometries(center, false), mats.steel));
    tilt.add(g1);
    part(g1, [0, sign * 6.5, 0], 0.25);
    return g1;
  }
  buildStrap(1);
  buildStrap(-1);

  /* ---------------- movement ---------------- */
  const movement = new THREE.Group();
  movement.position.z = -0.3;
  tilt.add(movement);
  part(movement, [0, 0, -1.0], 0.35);

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.11, 96), mats.brass);
  plate.rotation.x = Math.PI / 2;
  movement.add(plate);

  const plateTexture = new THREE.Mesh(new THREE.CircleGeometry(1.46, 96), new THREE.MeshPhysicalMaterial({
    map: stripeTexture(), metalness: 1, roughness: 0.38, envMapIntensity: 1,
  }));
  plateTexture.position.z = 0.058;
  movement.add(plateTexture);

  const wheels = [];
  const wheelDefs = [
    { r: 0.42, x: -0.55, y: 0.32, speed: 0.22, teeth: 26 },
    { r: 0.27, x: 0.28, y: 0.62, speed: -0.34, teeth: 20 },
    { r: 0.32, x: 0.62, y: -0.24, speed: 0.16, teeth: 22 },
    { r: 0.21, x: -0.15, y: -0.55, speed: -0.5, teeth: 18 },
  ];
  for (const d of wheelDefs) {
    const m = new THREE.Mesh(wheelGeometry(d.r, 0.06, d.teeth), mats.brass);
    m.position.set(d.x, d.y, 0.12);
    m.rotation.z = Math.random() * Math.PI;
    movement.add(m);
    wheels.push({ mesh: m, speed: d.speed });
  }

  const balance = new THREE.Group();
  const bRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.026, 8, 48), mats.brass);
  balance.add(bRing);
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.022, 0.022), mats.brass);
    sp.rotation.z = (i / 3) * Math.PI;
    balance.add(sp);
  }
  const bHub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 18), mats.brassDark);
  bHub.rotation.x = Math.PI / 2;
  balance.add(bHub);
  balance.position.set(-0.62, -0.62, 0.16);
  movement.add(balance);

  const jewels = [];
  for (const [x, y] of [[-0.55, 0.32], [0.28, 0.62], [0.62, -0.24], [-0.62, -0.62], [0.0, 0.0]]) {
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), mats.ruby);
    j.rotation.x = Math.PI / 2;
    j.position.set(x, y, 0.18);
    movement.add(j);
    jewels.push(j);
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 18), mats.dark);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(Math.sin(a) * 1.22, Math.cos(a) * 1.22, 0.1);
    movement.add(screw);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.016, 0.01), mats.steelBrushed);
    slot.position.set(screw.position.x, screw.position.y, 0.122);
    slot.rotation.z = a;
    movement.add(slot);
  }

  /* ---------------- rotor ---------------- */
  const rotorShape = new THREE.Shape();
  rotorShape.absarc(0, 0, 1.24, 0.2, Math.PI - 0.2, false);
  rotorShape.absarc(0, 0, 0.46, Math.PI - 0.2, 0.2, true);
  const rotorGeo = new THREE.ExtrudeGeometry(rotorShape, {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2,
  });
  const rotor = new THREE.Mesh(rotorGeo, mats.brassDark);
  rotor.position.z = -0.46;
  tilt.add(rotor);
  part(rotor, [0, 0, -1.7], 0.48);

  /* ---------------- assemble ---------------- */
  tilt.rotation.x = 0.13;
  tilt.rotation.y = -0.06;

  const anchors = [
    { id: 'crystal', pos: new THREE.Vector3(1.35, 1.05, 0.45), dx: 26, dy: -34, side: 'right' },
    { id: 'bezel', pos: new THREE.Vector3(1.55, 0.62, 0.42), dx: 34, dy: -10, side: 'right' },
    { id: 'case', pos: new THREE.Vector3(-1.62, -0.5, 0.2), dx: -34, dy: 14, side: 'left' },
    { id: 'crown', pos: new THREE.Vector3(2.06, -0.06, 0.0), dx: 34, dy: 22, side: 'right' },
    { id: 'caliber', pos: new THREE.Vector3(-0.3, -1.05, 0.21), dx: -12, dy: 40, side: 'left' },
  ].map((a) => ({ ...a, world: new THREE.Vector3() }));

  function setExplode(amount, time) {
    for (const obj of exploded) {
      const order = obj.userData.order;
      const t = THREE.MathUtils.clamp((amount - order * 0.1) / (1 - order * 0.1 + 0.0001), 0, 1);
      const e = t * t * (3 - 2 * t);
      const base = obj.userData.base;
      const dir = obj.userData.dir;
      obj.position.set(base.x + dir.x * e, base.y + dir.y * e, base.z + dir.z * e);
    }
    // movement life
    if (time !== undefined) {
      for (const w of wheels) w.mesh.rotation.z += w.speed * 0.0035;
      balance.rotation.z = Math.sin(time * 4.2) * 0.5;
      rotor.rotation.z = Math.sin(time * 0.12) * 0.35;
    }
  }

  function update() {
    // real local time, with a sweeping seconds hand
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    hourHand.rotation.z = -(h / 12) * Math.PI * 2;
    minHand.rotation.z = -(m / 60) * Math.PI * 2;
    secHand.rotation.z = -(s / 60) * Math.PI * 2;
  }

  function dispose() {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach((m) => {
          Object.values(m).forEach((v) => {
            if (v && v.isTexture) v.dispose();
          });
          m.dispose();
        });
      }
    });
  }

  update(); // set the hands to the current time for the first frame

  return { root, tilt, anchors, exploded, setExplode, update, dispose, materials: mats };
}
