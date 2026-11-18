import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { type Incident } from "@/lib/centinela-data";
import {
  Sparkles,
  Compass,
  RotateCw,
  Play,
  Pause,
  MapPin,
  Map as MapIcon,
  Flame,
  Radio,
  Satellite,
  Layers,
  ChevronDown,
} from "lucide-react";

interface Props {
  incidents: Incident[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
  onEnterTacticalMap?: (() => void) | undefined;
  initialProgress?: number | undefined;
}

const rad = Math.PI / 180;
const clamp = (t: number, a = 0, b = 1) => Math.min(b, Math.max(a, t));
const sm = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Convert lat & lon to 3D sphere vector (matching ScrollWorld standard)
const toV = (lat: number, lon: number, r = 1) =>
  new THREE.Vector3(
    Math.cos(lat * rad) * Math.cos(lon * rad),
    Math.sin(lat * rad),
    -Math.cos(lat * rad) * Math.sin(lon * rad)
  ).multiplyScalar(r);

// Approximate boundary of Bolivia [lat, lon]
const BOLIVIA_BORDER: [number, number][] = [
  [-11.05, -69.58],
  [-10.3, -69.0],
  [-9.9, -67.0],
  [-9.7, -65.3],
  [-10.4, -65.3],
  [-11.0, -65.0],
  [-11.9, -65.0],
  [-12.3, -64.0],
  [-12.8, -63.0],
  [-13.2, -61.8],
  [-14.2, -60.5],
  [-15.2, -60.2],
  [-16.3, -60.2],
  [-16.3, -58.4],
  [-17.8, -57.5],
  [-19.0, -57.8],
  [-20.1, -58.2],
  [-19.9, -60.0],
  [-21.0, -62.3],
  [-22.1, -62.6],
  [-22.0, -63.9],
  [-22.8, -64.6],
  [-22.9, -65.0],
  [-22.5, -66.2],
  [-22.8, -67.0],
  [-22.0, -67.9],
  [-20.7, -68.5],
  [-19.4, -68.6],
  [-18.0, -69.0],
  [-17.5, -69.4],
  [-16.4, -69.0],
  [-15.2, -69.2],
  [-14.4, -69.4],
  [-13.4, -68.9],
  [-12.5, -69.0],
  [-11.5, -69.5],
];

// Bolivian Department reference coordinates
const DEPARTMENTS = [
  { name: "Cochabamba (Tunari)", lat: -17.39, lon: -66.16, risk: "CRÍTICO", color: 0xff334b },
  { name: "Santa Cruz (Chiquitanía)", lat: -17.78, lon: -63.18, risk: "ALTO", color: 0xff9900 },
  { name: "Beni (Madidi / Llanos)", lat: -14.83, lon: -64.9, risk: "ALTO", color: 0xff9900 },
  { name: "La Paz (Yungas)", lat: -16.5, lon: -68.15, risk: "MEDIO", color: 0x00e5ff },
  { name: "Chuquisaca", lat: -19.03, lon: -65.26, risk: "MEDIO", color: 0xf59e0b },
  { name: "Tarija", lat: -21.53, lon: -64.73, risk: "ALTO", color: 0xff5252 },
  { name: "Oruro", lat: -17.97, lon: -67.1, risk: "MEDIO", color: 0x00e5ff },
  { name: "Potosí", lat: -19.58, lon: -65.75, risk: "BAJO", color: 0x10b981 },
  { name: "Pando", lat: -11.03, lon: -68.77, risk: "BAJO", color: 0x10b981 },
];

const BOLIVIA_CENTER = { lat: -16.6, lon: -64.6 };

// [progress, x, y, scale] camera rig keyframes
const RIG_KEYS: [number, number, number, number][] = [
  [0.0, 0, 0, 1.35],       // Deep space orbit: full planet Earth visible
  [0.2, 0.2, 0, 1.6],      // Beginning descent
  [0.45, 0.1, 0, 2.3],     // Stratosphere entry
  [0.7, 0, 0, 3.2],        // Bolivia airspace: borders ignite
  [1.0, 0, 0, 4.4],        // Tactical close-up over Cochabamba / Tunari
];

function rigAt(p: number): [number, number, number] {
  for (let i = 0; i < RIG_KEYS.length - 1; i++) {
    const a = RIG_KEYS[i];
    const b = RIG_KEYS[i + 1];
    if (a && b && p <= b[0]) {
      const t = clamp((p - a[0]) / (b[0] - a[0]));
      const e = t * 0.4 + sm(t) * 0.6;
      return [lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3], b[3], e)];
    }
  }
  const k = RIG_KEYS[RIG_KEYS.length - 1] ?? [0, 0, 0, 1.35];
  return [k[1], k[2], k[3]];
}

// Photorealistic Shaders from ScrollWorld
const earthVert = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const earthFrag = `
uniform sampler2D dayT;
uniform sampler2D nightT;
uniform sampler2D specT;
uniform sampler2D normT;
uniform vec3 sun;
uniform float detail;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for(int i = 0; i < 5; i++){
    s += a * vn(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}
vec3 perturb(vec3 N, vec3 p, vec2 uv, vec3 m){
  vec3 q0 = dFdx(p), q1 = dFdy(p);
  vec2 s0 = dFdx(uv), s1 = dFdy(uv);
  vec3 a = cross(q1, N), b = cross(N, q0);
  vec3 T = a * s0.x + b * s1.x, B = a * s0.y + b * s1.y;
  float det = max(dot(T, T), dot(B, B));
  float sc = det == 0.0 ? 0.0 : inversesqrt(det);
  return normalize(T * (m.x * sc) + B * (m.y * sc) + N * m.z);
}
void main(){
  vec3 N0 = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 S = normalize(sun);
  vec3 mn = texture2D(normT, vUv).xyz * 2.0 - 1.0;
  mn.xy *= 1.9;
  vec3 N = perturb(N0, vW, vUv, normalize(mn));
  float d = dot(N, S), d0 = dot(N0, S);
  vec3 day = texture2D(dayT, vUv).rgb;
  vec3 night = texture2D(nightT, vUv).rgb;
  float sp = texture2D(specT, vUv).r;

  // Procedural micro relief on terrain when zooming in
  float fn = fbm(vUv * vec2(1400.0, 700.0));
  day *= 1.0 + (fn - 0.5) * detail * 1.1 * (1.0 - sp);
  day = pow(day, vec3(0.92));
  day = mix(vec3(dot(day, vec3(0.3, 0.59, 0.11))), day, 1.18);

  float dayF = smoothstep(-0.12, 0.30, d0);
  vec3 col = day * (0.045 + max(d, 0.0) * 1.25) * dayF + day * 0.04 * (1.0 - dayF);
  // Real night city lights
  col += night * vec3(1.0, 0.68, 0.34) * (2.7 + detail * 1.6) * (1.0 - dayF) * (0.85 + fn * 0.3);

  // Ocean specular glint under sun
  vec3 R = reflect(-S, N0);
  col += sp * pow(max(dot(R, V), 0.0), 600.0) * 0.05 * dayF;

  // Atmosphere rim Fresnel and sunset horizon
  float fr = pow(1.0 - max(dot(N0, V), 0.0), 3.0);
  float tz = exp(-pow((d0 - 0.02) * 4.5, 2.0));
  vec3 rim = mix(vec3(0.2, 0.45, 1.0), vec3(1.0, 0.5, 0.18), tz * 0.85);
  col += rim * fr * 0.65 * (0.15 + max(d0, 0.0) + tz * 0.35);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const atmoVert = `
varying vec3 vNV;
varying vec3 vNW;
void main(){
  vNV = normalize(normalMatrix * normal);
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const atmoFrag = `
uniform vec3 sun;
varying vec3 vNV;
varying vec3 vNW;
void main(){
  float i = pow(max(0.72 - dot(vNV, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  float d = dot(vNW, normalize(sun));
  float l = 0.25 + max(d, 0.0) * 0.95;
  float tz = exp(-pow((d - 0.0) * 3.5, 2.0));
  vec3 c = mix(vec3(0.3, 0.58, 1.0), vec3(1.0, 0.52, 0.2), tz * 0.8);
  gl_FragColor = vec4(c * i * (l + tz * 0.35) * 0.95, i * (l + tz * 0.3));
}`;

export function PlanetaryGlobe({
  incidents,
  selectedId,
  onSelect,
  className = "",
  onEnterTacticalMap,
  initialProgress = 0,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [diveProgress, setDiveProgress] = useState(initialProgress);
  const [isPlayingDive, setIsPlayingDive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const progressRef = useRef(initialProgress);
  progressRef.current = diveProgress;

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  // Cinematic Auto-Dive Playback
  useEffect(() => {
    if (!isPlayingDive) return;

    let startTime = performance.now();
    const durationMs = 4000; // 4.0s cinematic fly-through
    const startProgress = progressRef.current;
    const targetProgress = startProgress >= 0.95 ? 0 : 1;

    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const current = startProgress + (targetProgress - startProgress) * eased;

      setDiveProgress(current);

      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setIsPlayingDive(false);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingDive]);

  // Handle Wheel on Canvas to scrub the dive smoothly
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * 0.0015;
    setDiveProgress((prev) => Math.max(0, Math.min(1, prev + delta)));
  }, []);

  // Main Photorealistic Three.js World Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x02030a, 1);
    container.appendChild(renderer.domElement);

    // 2. Load Real Photorealistic NASA Textures from /tex/
    const tl = new THREE.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const tex = (fileName: string, srgb = true) => {
      const t = tl.load(`/tex/${fileName}`);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    };

    const sun = new THREE.Vector3(-1, 0.6, 0.9);

    // 3. Planet Rig & Group
    const rig = new THREE.Group();
    scene.add(rig);

    const earthG = new THREE.Group();
    rig.add(earthG);

    // Earth Shader Material using NASA Blue Marble textures
    const earthMat = new THREE.ShaderMaterial({
      vertexShader: earthVert,
      fragmentShader: earthFrag,
      uniforms: {
        dayT: { value: tex("earth_atmos_2048.jpg") },
        nightT: { value: tex("earth_lights_2048.png") },
        specT: { value: tex("earth_specular_2048.jpg", false) },
        normT: { value: tex("earth_normal_2048.jpg", false) },
        sun: { value: sun },
        detail: { value: 0 },
      },
    });
    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat);
    earthG.add(earthMesh);

    // Separate Rotating Clouds Layer
    const cloudMat = new THREE.MeshLambertMaterial({
      map: tex("earth_clouds_1024.png"),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 96), cloudMat);
    earthG.add(clouds);

    // Outer Atmospheric Rayleigh Scattering Halo
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: atmoVert,
      fragmentShader: atmoFrag,
      uniforms: { sun: { value: sun } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    rig.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 96), atmoMat));

    // Directional Sunlight & Ambient Light
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x223355, 0.4));

    // 4. Starfield Background
    const starCount = 2400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 25 + Math.random() * 25;
      const a = Math.random() * 6.283;
      const b = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPositions[i * 3 + 1] = r * Math.cos(b);
      starPositions[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 5. Bolivia: Glowing Neon Vector Boundary & Tactical Fill
    const borderPoints = BOLIVIA_BORDER.map(([lat, lon]) => toV(lat, lon, 1.008));
    const borderOutline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(borderPoints),
      new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    earthG.add(borderOutline);

    const c2 = BOLIVIA_BORDER.map(([lat, lon]) => new THREE.Vector2(lon, lat));
    const tri = THREE.ShapeUtils.triangulateShape(c2, []);
    const fillGeo = new THREE.BufferGeometry().setFromPoints(
      BOLIVIA_BORDER.map(([lat, lon]) => toV(lat, lon, 1.006))
    );
    fillGeo.setIndex(tri.flat());
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    earthG.add(new THREE.Mesh(fillGeo, fillMat));

    // Department reference rings on the globe
    const deptGroup = new THREE.Group();
    earthG.add(deptGroup);

    DEPARTMENTS.forEach((dept) => {
      const pos = toV(dept.lat, dept.lon, 1.007);
      const ringGeo = new THREE.RingGeometry(0.012, 0.024, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: dept.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      deptGroup.add(ring);
    });

    // 6. NASA Incident Fire Pillars & Shockwave Rings
    const fireGroup = new THREE.Group();
    earthG.add(fireGroup);

    const fireRings: { mesh: THREE.Mesh; baseScale: number }[] = [];

    incidents.forEach((inc) => {
      const p = toV(inc.lat, inc.lng, 1.0);
      const beamHeight = 0.16 + (inc.frp ? Math.min(inc.frp / 90, 0.35) : 0.1);
      const beamGeo = new THREE.CylinderGeometry(0.005, 0.015, beamHeight, 8);
      const isHarmonized = inc.source === "MODIS+VIIRS armonizado";
      const beamColor = isHarmonized ? 0x00f0ff : 0xff334b;

      const beamMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.copy(p.clone().multiplyScalar(1 + beamHeight / 2));
      beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
      fireGroup.add(beamMesh);

      // Expanding thermal shockwave ring on the real globe surface
      const flareGeo = new THREE.RingGeometry(0.012, 0.045, 16);
      const flareMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const flareMesh = new THREE.Mesh(flareGeo, flareMat);
      flareMesh.position.copy(p.clone().multiplyScalar(1.008));
      flareMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize());
      fireGroup.add(flareMesh);

      fireRings.push({ mesh: flareMesh, baseScale: 1.0 });
    });

    // 7. 4 NASA Satellites in 3D Orbital Rings (TERRA, AQUA, SUOMI-NPP, NOAA-20)
    const ringGroup = new THREE.Group();
    rig.add(ringGroup);

    const orbitConfigs = [
      { radius: 1.45, tiltX: 0.45, tiltZ: 0.2, color: 0x00f0ff, speed: 0.012, satName: "TERRA (MODIS)" },
      { radius: 1.62, tiltX: -0.65, tiltZ: -0.35, color: 0x38bdf8, speed: 0.009, satName: "AQUA (MODIS)" },
      { radius: 1.78, tiltX: 0.85, tiltZ: 0.75, color: 0x10b981, speed: 0.014, satName: "SUOMI-NPP (VIIRS)" },
      { radius: 1.95, tiltX: -0.3, tiltZ: 0.9, color: 0xf59e0b, speed: 0.01, satName: "NOAA-20 (VIIRS)" },
    ];

    const satellites: { mesh: THREE.Mesh; angle: number; speed: number; radius: number; group: THREE.Group }[] = [];

    orbitConfigs.forEach((cfg) => {
      const ringPts = new THREE.EllipseCurve(0, 0, cfg.radius, cfg.radius, 0, Math.PI * 2)
        .getPoints(120)
        .map((pt) => new THREE.Vector3(pt.x, pt.y, 0));
      const ringMat = new THREE.LineBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.45,
      });
      const orbitLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts), ringMat);
      orbitLine.rotation.x = Math.PI / 2 + cfg.tiltX;
      orbitLine.rotation.z = cfg.tiltZ;

      const subGroup = new THREE.Group();
      subGroup.add(orbitLine);

      // Satellite body
      const satGeo = new THREE.BoxGeometry(0.04, 0.025, 0.025);
      const satMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      const satMesh = new THREE.Mesh(satGeo, satMat);

      // Solar panel wings
      const panelGeo = new THREE.BoxGeometry(0.1, 0.006, 0.02);
      const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      satMesh.add(new THREE.Mesh(panelGeo, panelMat));

      subGroup.add(satMesh);
      ringGroup.add(subGroup);

      satellites.push({
        mesh: satMesh,
        angle: Math.random() * Math.PI * 2,
        speed: cfg.speed,
        radius: cfg.radius,
        group: subGroup,
      });
    });

    // 8. Unreal Bloom Post-Processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.15, 0.25, 0.95);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // 9. Interactive Drag & Mouse Parallax
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;

      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      earthG.rotation.y += dx * 0.005;
      earthG.rotation.x += dy * 0.005;

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 10. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    const face = { lat: BOLIVIA_CENTER.lat + 25, lon: BOLIVIA_CENTER.lon + 75 };
    let sp0 = progressRef.current;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = progressRef.current; // 0..1

      // Smooth progress smoothing
      sp0 += (p - sp0) * 0.08;
      const q = sp0;

      // Position and Scale of the Earth Rig based on dive progress
      const [rx, ry, rs] = rigAt(q);
      const isMobile = window.innerWidth < 640;
      rig.position.set(rx, ry, 0);
      rig.scale.setScalar(rs * (isMobile ? 0.85 : 1.0));

      // Target rotation towards Bolivia as dive progress increases
      const off = 1 - sm(q / 0.45);
      if (!isDragging) {
        if (autoRotateRef.current && q < 0.1) {
          face.lon += 0.08; // Ambient rotation in space
        } else {
          face.lat += (BOLIVIA_CENTER.lat + off * 25 - face.lat) * 0.06;
          face.lon += (BOLIVIA_CENTER.lon + off * 75 - face.lon) * 0.06;
        }
        earthG.rotation.set(face.lat * rad, -(90 + face.lon) * rad, 0);
      }

      // Clouds rotate gently independent of earth
      clouds.rotation.y = t * 0.005;

      // Dynamic sunlight vector creates realistic day/night transition
      const tw = sm((q - 0.5) / 0.25);
      sun.set(lerp(-1, -1, tw), lerp(0.6, 0.12, tw), lerp(0.9, 0.3, tw)).normalize();
      dirLight.position.copy(sun).multiplyScalar(10);

      // Micro-detail relief enhancement when zoomed in
      if (earthMat.uniforms["detail"]) {
        earthMat.uniforms["detail"].value = sm((q - 0.5) / 0.35);
      }

      // Bolivia vector outline glow opacity increases during descent
      const bo = sm((q - 0.4) / 0.2);
      borderOutline.material.opacity = bo * (0.85 + Math.sin(t * 2) * 0.15);
      fillMat.opacity = bo * 0.12;

      // Fire pillars & rings pulse
      const ringScale = 1 + Math.sin(t * 4) * 0.3;
      fireRings.forEach((r) => {
        r.mesh.scale.set(ringScale, ringScale, ringScale);
      });

      // Animate satellites around orbits
      satellites.forEach((sat) => {
        sat.angle += sat.speed;
        const x = Math.cos(sat.angle) * sat.radius;
        const y = Math.sin(sat.angle) * sat.radius;
        sat.mesh.position.set(x, y, 0);
      });

      // Subtle starfield twinkling and rotation
      stars.rotation.y = t * 0.002 + q * 0.3;

      // Camera parallax with mouse
      camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.04;
      camera.position.y += (-mouse.y * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      composer.render();
    };

    animate();

    // 11. Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      composer.dispose();
      renderer.dispose();
    };
  }, [incidents]);

  // Altitude calculations for HUD display
  const currentAltitudeKm = Math.round(lerp(820, 4.5, diveProgress));
  const altitudeStage =
    diveProgress < 0.25
      ? "ÓRBITA LEO GEOESTACIONARIA · 820 KM"
      : diveProgress < 0.55
      ? "INGRESO A LA TERMOSFERA · 150 KM"
      : diveProgress < 0.85
      ? "ESTRATOSFERA · ESPACIO AÉREO NACIONAL"
      : "ESPACIO AÉREO TÁCTICO · BOLIVIA (4.5 KM)";

  return (
    <div
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none bg-[#02030a] ${className}`}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* =========================================================
          TOP HUD OVERLAY: DYNAMIC REAL-TIME TELEMETRY
         ========================================================= */}
      <div className="pointer-events-none absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Altitude & Stage */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-500/30 bg-slate-950/80 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.25)]">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-black tracking-widest text-white">
              <span>ALTITUD: {currentAltitudeKm.toLocaleString()} KM</span>
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-300">
                {(diveProgress * 100).toFixed(0)}% DIVE
              </span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">
              {altitudeStage}
            </div>
          </div>
        </div>

        {/* Right: Target Indicator */}
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-slate-950/80 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_rgba(255,51,75,0.25)]">
          <Flame className="h-4 w-4 text-red-400 animate-pulse" />
          <div className="text-right">
            <div className="font-mono text-xs font-black tracking-wider text-red-300">
              OBJETIVO: BOLIVIA · {incidents.length} FOCOS NASA
            </div>
            <div className="font-mono text-[9px] text-slate-400">
              COCHABAMBA (-17.389°, -66.156°) · PARQUE TUNARI
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CENTER FLOATING TARGET PIN (VISIBLE DURING DESCENT)
         ========================================================= */}
      {diveProgress > 0.45 && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center animate-in fade-in zoom-in-75 duration-300">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute h-full w-full rounded-full border border-cyan-400/60 animate-ping opacity-60" />
            <div className="absolute h-10 w-10 rounded-full border border-dashed border-red-500/80 animate-spin-slow" />
            <MapPin className="h-6 w-6 text-red-400 drop-shadow-[0_0_10px_#ff334b]" />
          </div>
          <div className="mt-1 flex items-center gap-1.5 rounded-full border border-red-500/50 bg-slate-950/90 px-3 py-1 font-mono text-[10px] font-bold text-red-200 backdrop-blur-md shadow-[0_0_15px_rgba(255,51,75,0.4)]">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
            <span>FRENTE ACTIVO TUNARI NORTE</span>
          </div>
        </div>
      )}

      {/* =========================================================
          BOTTOM DIVE CONTROLLER & PRESET STAGES
         ========================================================= */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-col items-center gap-2">
        {/* Preset Stage Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-1.5 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.8)]">
          <button
            onClick={() => setDiveProgress(0)}
            className={`rounded-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              diveProgress < 0.2
                ? "border border-cyan-400/70 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🌌 Órbita (800 km)
          </button>
          <button
            onClick={() => setDiveProgress(0.45)}
            className={`rounded-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              diveProgress >= 0.2 && diveProgress < 0.65
                ? "border border-cyan-400/70 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ☁️ Estratosfera (150 km)
          </button>
          <button
            onClick={() => setDiveProgress(0.75)}
            className={`rounded-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              diveProgress >= 0.65 && diveProgress < 0.95
                ? "border border-cyan-400/70 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇧🇴 Bolivia (45 km)
          </button>
          <button
            onClick={() => setDiveProgress(1.0)}
            className={`rounded-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              diveProgress >= 0.95
                ? "border border-red-400/70 bg-red-500/25 text-white shadow-[0_0_12px_rgba(255,51,75,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🎯 Tunari Táctico (5 km)
          </button>

          {/* Cinematic Auto-Dive Play Button */}
          <button
            onClick={() => setIsPlayingDive(!isPlayingDive)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 font-mono text-[10px] font-bold transition-all ${
              isPlayingDive
                ? "border-red-400 bg-red-500/30 text-red-200 animate-pulse"
                : "border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
            }`}
          >
            {isPlayingDive ? (
              <>
                <Pause className="h-3 w-3" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Auto-Inmersión</span>
              </>
            )}
          </button>

          {/* Switch to 2D Sub-metric Tactical Map */}
          {onEnterTacticalMap && (
            <button
              onClick={onEnterTacticalMap}
              className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 font-mono text-[10px] font-bold text-emerald-300 transition-all hover:bg-emerald-900/60"
            >
              <MapIcon className="h-3 w-3" />
              <span>Mapa 2D</span>
            </button>
          )}

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-slate-400 hover:text-white"
            title="Auto-Giro"
          >
            <RotateCw className={`h-3.5 w-3.5 ${autoRotate ? "animate-spin-slow text-cyan-300" : ""}`} />
          </button>
        </div>

        {/* Interactive Scrub Slider */}
        <div className="flex w-full max-w-md items-center gap-2 px-4">
          <span className="font-mono text-[9px] text-slate-400">ÓRBITA</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={diveProgress}
            onChange={(e) => setDiveProgress(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400 transition-all hover:bg-slate-700"
          />
          <span className="font-mono text-[9px] text-cyan-400">TUNARI</span>
        </div>
      </div>
    </div>
  );
}
