import * as THREE from 'three';
import { buildWatch } from './watch.js';

/* One cue table. Each cue is a complete shot. */
const CUES = [
  { at: 0.0, cam: [0.15, 1.0, 13.4], target: [0, 0.08, 0], rot: -0.34, explode: 0, fov: 32 },
  { at: 0.21, cam: [0.3, 0.78, 9.4], target: [-1.7, 0.32, 0], rot: -0.26, explode: 0, fov: 30, slimMul: 1.14 },
  { at: 0.44, cam: [0.5, 1.1, 13.2], target: [-1.3, -0.08, 0], rot: -1.4, explode: 1, fov: 32, mobileMul: 1.3, slimMul: 1.16 },
  { at: 0.63, cam: [7.4, 1.9, 9.6], target: [0, 0.05, 0], rot: -0.12, explode: 0, fov: 32 },
  { at: 0.82, cam: [-6.8, 1.6, 9.4], target: [0, 0.05, 0], rot: 0.18, explode: 0, fov: 32 },
  { at: 1.0, cam: [0.15, 1.0, 13.4], target: [0, 0.08, 0], rot: -0.34, explode: 0, fov: 32 },
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const lerp = (a, b, t) => a + (b - a) * t;

function cueAt(p) {
  if (p <= CUES[0].at) return CUES[0];
  for (let i = 0; i < CUES.length - 1; i++) {
    const a = CUES[i];
    const b = CUES[i + 1];
    if (p >= a.at && p <= b.at) {
      const t = smoothstep((p - a.at) / (b.at - a.at));
      return {
        cam: [
          lerp(a.cam[0], b.cam[0], t),
          lerp(a.cam[1], b.cam[1], t),
          lerp(a.cam[2], b.cam[2], t),
        ],
        target: [
          lerp(a.target[0], b.target[0], t),
          lerp(a.target[1], b.target[1], t),
          lerp(a.target[2], b.target[2], t),
        ],
        rot: lerp(a.rot, b.rot, t),
        explode: lerp(a.explode, b.explode, t),
        fov: lerp(a.fov, b.fov, t),
        mobileMul: a.mobileMul || b.mobileMul || 1,
        slimMul: a.slimMul || b.slimMul || 1,
      };
    }
  }
  return CUES[CUES.length - 1];
}

export async function createStage({ container, storyEl, onProgress, onLabels, onReady, onError, reduced = false }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    onError?.(err);
    return null;
  }

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarse ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(0.15, 1.0, 13.4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x05070a);
  {
    const geo = new THREE.PlaneGeometry(1, 1);
    const panel = (w, h, intensity, color, pos, rot) => {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      mat.color.multiplyScalar(intensity);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(w, h, 1);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      studio.add(mesh);
    };
    panel(8, 5, 6.0, 0xfff1dc, [-4.6, 7.0, 4.4], [0, -0.55, 0.5]); // key softbox, upper left
    panel(12, 1.0, 3.2, 0xfffaf2, [0, 5.4, 7.2], [0, 0, 0]); // high front strip
    panel(1.0, 9, 4.2, 0xf5f7f9, [7.0, 1.2, 1.2], [0, -1.4, 0]); // tall strip, right
    panel(0.8, 7, 2.6, 0xffffff, [-6.6, 0.8, 4.2], [0, -0.9, 0]); // left rim strip
    panel(5, 2.4, 2.4, 0xd9e4f0, [0.4, 3.0, -8], [0, 0, 0]); // rim, behind
    panel(6.5, 2, 0.6, 0xffd8ae, [0, -5.0, 4.6], [0.55, 0, 0]); // low warm bounce
    panel(1.6, 1.6, 4.0, 0xffffff, [2.2, 2.8, 7.0], [0, 0, 0]); // sparkle, front right
    panel(1.2, 3.4, 1.6, 0xffffff, [-3.0, -1.6, 6.2], [0, 0.35, 0]); // small front bounce
  }
  const envTex = pmrem.fromScene(studio, 0.02).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.95;

  const key = new THREE.DirectionalLight(0xfff2e2, 2.6);
  key.position.set(-5, 6.5, 7);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xe8f0ff, 2.2);
  rim.position.set(5, 2.5, -6);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffe9d0, 0.8);
  fill.position.set(0, -5, 5);
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  // Wait for webfonts so the dial print isn't measured with a fallback.
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* noop */
  }

  const watch = buildWatch();
  scene.add(watch.root);

  const labels = watch.anchors.map((a) => ({ id: a.id, x: 0, y: 0, opacity: 0 }));

  const renderTarget = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const goalCam = new THREE.Vector3();
  const goalTarget = new THREE.Vector3();
  let goalFov = 32;
  let goalRot = -0.34;
  let goalExplode = 0;
  let goalY = 0;
  let smoothY = 0;
  let progress = 0;
  let lastProgress = -1;
  let raf = 0;
  let running = true;
  let visible = true;
  let lastTime = 0;
  let storyTop = 0;
  let storyMax = 1;
  let viewW = 1;
  let viewH = 1;

  // drag-to-rotate, only while the specification shot is on screen
  let dragOffset = 0;
  let dragVel = 0;
  let dragging = false;
  let lastX = 0;
  let dragClass = false;

  function measure() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    viewW = w;
    viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    const portrait = camera.aspect < 0.62;
    const slim = camera.aspect >= 0.62 && camera.aspect < 0.82;
    const mid = camera.aspect >= 0.82 && camera.aspect < 1.25;
    camera.userData.distMul = portrait ? 1.95 : slim ? 1.45 : mid ? 1.28 : 1;
    camera.userData.targetXScale = portrait ? 0.28 : slim ? 0.34 : mid ? 0.58 : 1;
    camera.userData.portrait = portrait;
    camera.userData.slim = slim;
    goalY = portrait ? 1.75 : slim ? 0.9 : 0;

    camera.updateProjectionMatrix();

    if (storyEl) {
      const rect = storyEl.getBoundingClientRect();
      storyTop = rect.top + window.scrollY;
      storyMax = Math.max(1, storyEl.offsetHeight - window.innerHeight);
    }
  }

  const ro = new ResizeObserver(() => measure());
  ro.observe(container);
  if (storyEl) ro.observe(storyEl);
  measure();

  function readProgress() {
    return clamp((window.scrollY - storyTop) / storyMax, 0, 1);
  }

  function snapTo(p) {
    const c = cueAt(p);
    const mul =
      (camera.userData.distMul || 1) *
      (camera.userData.portrait && c.mobileMul ? c.mobileMul : 1) *
      (camera.userData.slim && c.slimMul ? c.slimMul : 1);
    goalTarget.set(c.target[0] * (camera.userData.targetXScale || 1), c.target[1], c.target[2]);
    goalCam
      .set(c.cam[0], c.cam[1], c.cam[2])
      .sub(goalTarget)
      .multiplyScalar(mul)
      .add(goalTarget);
    camera.position.copy(goalCam);
    camTarget.copy(goalTarget);
    camera.fov = c.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(camTarget);
    watch.root.rotation.y = c.rot;
    goalRot = c.rot;
    goalExplode = c.explode;
    smoothY = goalY;
    watch.setExplode(c.explode, 0);
  }

  function projectLabels(p) {
    if (!onLabels) return;
    const visibleRange = smoothstep((p - 0.605) / 0.03) * (1 - smoothstep((p - 0.75) / 0.03));
    const v = new THREE.Vector3();
    for (let i = 0; i < watch.anchors.length; i++) {
      const a = watch.anchors[i];
      v.copy(a.pos).applyMatrix4(watch.tilt.matrixWorld).project(camera);
      const onScreen = v.z < 1 && v.x > -1.15 && v.x < 1.15 && v.y > -1.15 && v.y < 1.15;
      labels[i].x = (v.x * 0.5 + 0.5) * viewW;
      labels[i].y = (-v.y * 0.5 + 0.5) * viewH;
      labels[i].opacity = visibleRange * (onScreen ? 1 : 0);
    }
    onLabels(labels, visibleRange);
  }

  function tick(now) {
    if (!running || !visible) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    progress = readProgress();
    if (Math.abs(progress - lastProgress) > 0.0002) {
      lastProgress = progress;
      onProgress?.(progress);
    }

    const c = cueAt(progress);
    const mul =
      (camera.userData.distMul || 1) *
      (camera.userData.portrait && c.mobileMul ? c.mobileMul : 1) *
      (camera.userData.slim && c.slimMul ? c.slimMul : 1);
    goalTarget.set(c.target[0] * (camera.userData.targetXScale || 1), c.target[1], c.target[2]);
    goalCam
      .set(c.cam[0], c.cam[1], c.cam[2])
      .sub(goalTarget)
      .multiplyScalar(mul)
      .add(goalTarget);
    goalRot = c.rot;
    goalFov = c.fov;
    goalExplode = c.explode;

    const damp = 1 - Math.exp(-5.2 * dt);
    camera.position.lerp(goalCam, damp);
    camTarget.lerp(goalTarget, damp);
    camera.fov += (goalFov - camera.fov) * damp;
    camera.updateProjectionMatrix();
    camera.lookAt(camTarget);

    smoothY += (goalY - smoothY) * damp;
    watch.root.position.y = smoothY;

    const canDrag = progress > 0.55 && progress < 0.88;
    if (canDrag !== dragClass) {
      dragClass = canDrag;
      container.classList.toggle('is-draggable', canDrag);
    }
    if (!dragging) {
      dragVel *= 0.9;
      dragOffset *= 0.995;
    }
    dragOffset = clamp(dragOffset + dragVel, -1.4, 1.4);

    // idle drift keeps it alive; tiny enough to read as breathing
    if (!reduced) {
      const targetRot = goalRot + dragOffset;
      watch.root.rotation.y += (targetRot - watch.root.rotation.y) * (1 - Math.exp(-4.2 * dt));
      watch.root.rotation.x = Math.sin(now * 0.00035) * 0.012;
      watch.root.position.x = Math.sin(now * 0.00028) * 0.02;
    } else {
      watch.root.rotation.y = goalRot;
    }

    watch.setExplode(goalExplode, now / 1000);
    watch.update();

    scene.updateMatrixWorld();
    renderer.render(scene, camera);
    projectLabels(progress);
  }

  async function start() {
    snapTo(0);
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      /* compileAsync can fail on some drivers; first render still works */
    }
    renderer.render(scene, camera);
    onReady?.();
    lastTime = 0;
    if (!reduced) {
      raf = requestAnimationFrame(tick);
    } else {
      onProgress?.(0);
      projectLabels(0);
    }
  }

  const onPointerDown = (e) => {
    if (reduced || e.pointerType === 'touch') return;
    if (e.target.closest('a, button, input, textarea')) return;
    if (progress < 0.55 || progress > 0.88) return;
    dragging = true;
    lastX = e.clientX;
    container.classList.add('is-dragging');
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    dragVel += dx * 0.006;
  };
  const onPointerUp = () => {
    dragging = false;
    container.classList.remove('is-dragging');
  };
  container.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });

  // pause when the stage leaves the viewport
  const io = new IntersectionObserver(    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) {
        cancelAnimationFrame(raf);
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    },
    { rootMargin: '120px' }
  );
  io.observe(container);

  const onVisibility = () => {
    running = !document.hidden;
    if (running && !reduced && !document.hidden) {
      cancelAnimationFrame(raf);
      lastTime = 0;
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onReducedScroll = () => {
    if (!reduced) return;
    const p = readProgress();
    onProgress?.(p);
    const c = cueAt(p);
    goalExplode = c.explode;
    watch.setExplode(c.explode);
    watch.root.rotation.y = c.rot;
    watch.update();
    const mul =
      (camera.userData.distMul || 1) *
      (camera.userData.portrait && c.mobileMul ? c.mobileMul : 1) *
      (camera.userData.slim && c.slimMul ? c.slimMul : 1);
    goalTarget.set(c.target[0] * (camera.userData.targetXScale || 1), c.target[1], c.target[2]);
    goalCam.set(c.cam[0], c.cam[1], c.cam[2]).sub(goalTarget).multiplyScalar(mul).add(goalTarget);
    camera.position.copy(goalCam);
    camTarget.copy(goalTarget);
    camera.fov = c.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(camTarget);
    scene.updateMatrixWorld();
    renderer.render(scene, camera);
    projectLabels(p);
  };
  if (reduced) window.addEventListener('scroll', onReducedScroll, { passive: true });

  await start();

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('scroll', onReducedScroll);
    container.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    watch.dispose();
    envTex.dispose();
    pmrem.dispose();
    studio.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { dispose, renderer, watch };
}
