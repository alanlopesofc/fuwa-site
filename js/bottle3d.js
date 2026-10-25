import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BLUE = 0x6f86a3;
const DARK = 0x1c2530;
const TAU = Math.PI * 2;

function smoothLathe(radius, height, capRadius = 1.8, segments = 64) {
  const h = height / 2;
  const r = radius;
  const c = Math.min(capRadius, r * 0.3, h * 0.3);
  const points = [
    new THREE.Vector2(0, -h),
    new THREE.Vector2(r - c, -h),
    new THREE.Vector2(r - c * 0.35, -h + c * 0.18),
    new THREE.Vector2(r - c * 0.08, -h + c * 0.65),
    new THREE.Vector2(r, -h + c),
    new THREE.Vector2(r, h - c),
    new THREE.Vector2(r - c * 0.08, h - c * 0.2),
    new THREE.Vector2(r - c * 0.35, h - c * 0.04),
    new THREE.Vector2(r - c, h),
    new THREE.Vector2(0, h),
  ];
  return new THREE.LatheGeometry(points, segments, 0, TAU);
}

function material(color = BLUE, { roughness = 0.55, clearcoat = 0.1 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    clearcoat,
    clearcoatRoughness: 0.45,
    metalness: 0,
  });
}

function makeBottle(labelTexture) {
  const root = new THREE.Group();
  root.name = 'fuwa-foamer-150ml';
  const blue = material();
  const blueDark = material(0x627a98, { roughness: 0.62, clearcoat: 0.08 });
  const dark = material(DARK, { roughness: 0.28, clearcoat: 0.02 });

  // 1 unit = 1 mm. The origin is the centre of the 128 mm body.
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.wrapS = THREE.RepeatWrapping;
  labelTexture.wrapT = THREE.ClampToEdgeWrapping;
  labelTexture.offset.x = 0.5; // LatheGeometry: u=0 fica em +Z (frente); o centro da arte (u=.5) precisa vir para a frente
  labelTexture.anisotropy = 8;
  labelTexture.needsUpdate = true;
  const bodyMat = blue.clone();
  bodyMat.color.set(0xffffff); // a textura já traz o azul; cor + mapa escureceria
  bodyMat.roughness = 0.62; bodyMat.clearcoat = 0.04;
  bodyMat.map = labelTexture;
  bodyMat.needsUpdate = true;

  const bodyGeo = smoothLathe(25, 128, 3, 128);
  // a LatheGeometry distribui o v pelo índice dos pontos do perfil; refaz o v pela altura real
  const pos = bodyGeo.attributes.position, uv = bodyGeo.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) uv.setY(i, (pos.getY(i) + 64) / 128);
  uv.needsUpdate = true;
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'body-128mm-with-label';
  root.add(body);

  // proporções medidas na foto de referência (app-01): colar rente ao corpo, um anel fino no ombro,
  // haste grossa (Ø23) que vira um bico longo para a frente, com orifício quadrado na ponta
  const collar = new THREE.Mesh(smoothLathe(25, 28, 3.2, 128), blue);
  collar.position.y = 79;
  collar.name = 'overcap-collar-flush';
  root.add(collar);

  const gap = new THREE.Mesh(new THREE.CylinderGeometry(24.6, 24.6, 1.2, 96), blueDark);
  gap.position.y = 64.6;
  root.add(gap);

  const shoulder = new THREE.Mesh(smoothLathe(18, 5.5, 1.3, 96), blue);
  shoulder.position.y = 95.9;
  shoulder.name = 'pump-shoulder-ring';
  root.add(shoulder);

  const stem = new THREE.Mesh(smoothLathe(11.5, 18, 1.2, 96), blue);
  stem.position.y = 107;
  stem.name = 'pump-stem';
  root.add(stem);

  // cabeça do pump: perfil lateral medido na foto (bico curto e encorpado, passa ~10 mm da haste)
  const prof = new THREE.Shape();
  prof.moveTo(-10, 111);
  prof.lineTo(-10, 115);
  prof.quadraticCurveTo(-10, 121, -4, 121);
  prof.lineTo(20, 120.6);
  prof.quadraticCurveTo(23.5, 120.5, 23.5, 117.4);
  prof.lineTo(23.5, 114.4);
  prof.quadraticCurveTo(23.5, 112, 21, 112.1);
  prof.lineTo(9, 112.4);
  prof.quadraticCurveTo(7, 112.4, 6, 111);
  prof.lineTo(-10, 111);
  const headGeo = new THREE.ExtrudeGeometry(prof, { depth: 17, bevelEnabled: true, bevelThickness: 2.4, bevelSize: 2.2, bevelSegments: 6, curveSegments: 24 });
  headGeo.translate(0, 0, -8.5);
  headGeo.rotateY(Math.PI); // bico aponta para -X: a 90° do rótulo, como no frasco real
  const head = new THREE.Mesh(headGeo, blue);
  head.name = 'pump-head-and-nozzle';
  root.add(head);

  const tunnel = new THREE.Mesh(new RoundedBoxGeometry(5, 5, 6, 4, 0.7), dark);
  tunnel.position.set(-25, 116.4, 0);
  tunnel.name = 'recessed-square-aperture';
  root.add(tunnel);
  const apertureRim = new THREE.Mesh(new RoundedBoxGeometry(0.8, 7.6, 8.4, 4, 1.1), blueDark);
  apertureRim.position.set(-25.9, 116.4, 0);
  apertureRim.name = 'aperture-rim';
  root.add(apertureRim);

  return { root, aperture: { x: 3, y: 2.6, z: 25.4, centerY: 107.5 } };
}

function loadLabel(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

function clamp01(value) { return Math.min(1, Math.max(0, value)); }
function smoothstep(value) { const t = clamp01(value); return t * t * (3 - 2 * t); }

export function createBottle({ container, onClip = () => {} }) {
  if (!container) throw new Error('createBottle precisa de um container');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'bottle3d-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 4000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff8ed, 2.2);
  key.position.set(-180, 250, 300);
  const rim = new THREE.DirectionalLight(0xb8d1ee, 2.5);
  rim.position.set(160, 230, -220);
  const fill = new THREE.HemisphereLight(0xf5eee2, 0x34475f, 0.75);
  scene.add(key, rim, fill);

  const labelUrl = new URL('../assets/3d/label-wrap.jpg', import.meta.url).href;
  const labelTexture = new THREE.TextureLoader().load(labelUrl);
  const bottle = makeBottle(labelTexture);
  scene.add(bottle.root);

  const state = { progress: 0, mouseX: 0, mouseY: 0, visible: true, disposed: false, frame: 0, lastRender: -1 };
  const startCamera = new THREE.Vector3(0, 40, 620);
  const closeCamera = new THREE.Vector3(0, 116.4, 100);
  const insideCamera = new THREE.Vector3(0, 116.4, 39);
  const lookStart = new THREE.Vector3(0, 40, 0);
  const lookAperture = new THREE.Vector3(0, 116.4, 26);
  const projected = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const apertureCorners = [
    new THREE.Vector3(-26.4, 113.8, -2.6), new THREE.Vector3(-26.4, 113.8, 2.6),
    new THREE.Vector3(-26.4, 119, 2.6), new THREE.Vector3(-26.4, 119, -2.6),
  ];
  let lastSize = { width: 0, height: 0 };

  function resize() {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    if (width === lastSize.width && height === lastSize.height) return;
    lastSize = { width, height };
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }

  function updateCamera(p) {
    const portrait = camera.aspect < 1;
    if (state.snapCam) { camera.position.set(0, 28, 660); camera.lookAt(0, 28, 0); return; }
    startCamera.set(0, portrait ? 10 : 40, portrait ? 1500 : 620);
    lookStart.set(0, portrait ? -95 : 40, 0);
    const approach = smoothstep((p - 0.1) / 0.5);
    if (p < 0.6) camera.position.lerpVectors(startCamera, closeCamera, approach);
    else camera.position.lerpVectors(closeCamera, insideCamera, smoothstep((p - 0.6) / 0.35));
    const target = new THREE.Vector3().lerpVectors(lookStart, lookAperture, approach);
    camera.lookAt(target);
  }

  function updateClip(p) {
    const rect = container.getBoundingClientRect();
    const enter = smoothstep((p - 0.55) / 0.2);
    const full = smoothstep((p - 0.72) / 0.23);
    bottle.root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const points = apertureCorners.map((corner, index) => {
      projected[index].copy(corner).applyMatrix4(bottle.root.matrixWorld).project(camera);
      return { x: (projected[index].x * 0.5 + 0.5) * rect.width, y: (-projected[index].y * 0.5 + 0.5) * rect.height };
    });
    const fullPoints = [{ x: 0, y: rect.height }, { x: rect.width, y: rect.height }, { x: rect.width, y: 0 }, { x: 0, y: 0 }];
    const polygon = points.map((point, index) => ({
      x: point.x + (fullPoints[index].x - point.x) * full,
      y: point.y + (fullPoints[index].y - point.y) * full,
    }));
    onClip(`polygon(${polygon.map(({ x, y }) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`, enter, full);
    return { enter, full };
  }

  function render(force = false) {
    if (state.disposed || (!state.visible && !force)) return;
    resize();
    const p = state.progress;
    const idle = reducedMotion ? 0 : Math.sin(performance.now() * 0.0014) * 0.7;
    bottle.root.rotation.set(
      THREE.MathUtils.degToRad(state.mouseY * 3 + idle * 0.35),
      THREE.MathUtils.degToRad(state.snapRot != null ? state.snapRot : (-14 + 104 * smoothstep((p - 0.1) / 0.45) + state.mouseX * 3)),
      0,
    );
    bottle.root.position.y = p < 0.6 ? Math.sin(performance.now() * 0.0014) * 0.8 : 0;
    updateCamera(p);
    bottle.root.visible = p < 0.97;
    const clip = updateClip(p);
    container.dataset.bottleEntry = clip.enter.toFixed(3);
    container.dataset.bottleFull = clip.full.toFixed(3);
    renderer.render(scene, camera);
    state.lastRender = p;
  }

  function requestRender() {
    if (state.frame || state.disposed) return;
    state.frame = requestAnimationFrame(() => { state.frame = 0; render(); });
  }

  function setProgress(value) {
    const p = clamp01(value);
    if (Math.abs(p - state.progress) < 0.0001 && !reducedMotion) return;
    state.progress = p;
    requestRender();
  }

  function setVisible(visible) { state.visible = visible; if (visible) requestRender(); }
  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    state.mouseX = (event.clientX - rect.left) / rect.width * 2 - 1;
    state.mouseY = (event.clientY - rect.top) / rect.height * 2 - 1;
    requestRender();
  }

  function snapshot(width = 2000, height = 3000, options = {}) {
    const previous = { progress: state.progress, visible: state.visible, size: { ...lastSize } };
    const oldAspect = camera.aspect;
    const oldCameraPosition = camera.position.clone();
    const oldCameraQuaternion = camera.quaternion.clone();
    const oldBottleRotation = bottle.root.rotation.clone();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    state.progress = 0;
    state.visible = true;
    state.snapRot = Number(options.rotationY || 0) - 6; state.snapCam = true;
    state.mouseX = 0; state.mouseY = Number(options.rotationX || 0) / 3;
    render(true);
    if (options.top) {
      camera.position.set(0, 270, 5);
      camera.lookAt(0, 35, 0);
      renderer.render(scene, camera);
    }
    const dataUrl = renderer.domElement.toDataURL('image/png');
    state.progress = previous.progress;
    state.visible = previous.visible;
    state.mouseX = 0;
    state.mouseY = 0; state.snapRot = null; state.snapCam = false;
    camera.position.copy(oldCameraPosition);
    camera.quaternion.copy(oldCameraQuaternion);
    bottle.root.rotation.copy(oldBottleRotation);
    camera.aspect = oldAspect;
    camera.updateProjectionMatrix();
    resize();
    requestRender();
    return dataUrl;
  }

  const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 });
  observer.observe(container);
  container.addEventListener('pointermove', onPointerMove, { passive: true });
  resize();
  render(true);

  // Low-frequency idle breathing keeps the hero alive without a permanent 60fps loop.
  let idleTimer = 0;
  if (!reducedMotion) idleTimer = window.setInterval(() => { if (state.visible && state.progress < 0.15) requestRender(); }, 42);

  return {
    setProgress,
    resize,
    snapshot,
    dispose() {
      state.disposed = true;
      if (state.frame) cancelAnimationFrame(state.frame);
      if (idleTimer) clearInterval(idleTimer);
      observer.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((item) => { item.map?.dispose(); item.dispose?.(); });
        }
      });
      scene.environment?.dispose?.();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export { loadLabel };
