import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { type Incident } from "@/lib/centinela-data";
import {
  Sparkles,
  Compass,
  RotateCw,
  Play,
  Pause,
  MapPin,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
  Radio,
  Maximize2,
} from "lucide-react";

interface Props {
  incidents: Incident[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
  onEnterTacticalMap?: (() => void) | undefined;
  initialProgress?: number | undefined;
}

// Convert latitude & longitude to 3D sphere coordinate
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Bolivia international border coordinates (simplified polygon for WebGL 3D line)
const BOLIVIA_BORDER: [number, number][] = [
  [-9.67, -65.37],
  [-10.82, -65.35],
  [-11.95, -65.04],
  [-12.48, -64.28],
  [-13.48, -61.85],
  [-14.00, -60.45],
  [-16.32, -58.98],
  [-17.58, -57.75],
  [-19.00, -57.72],
  [-20.15, -58.17],
  [-20.45, -62.15],
  [-22.00, -62.68],
  [-22.88, -64.33],
  [-22.18, -65.60],
  [-22.82, -67.50],
  [-21.80, -68.18],
  [-20.90, -68.45],
  [-19.18, -68.68],
  [-18.15, -69.05],
  [-17.28, -69.45],
  [-16.15, -69.10],
  [-15.25, -69.25],
  [-14.05, -68.95],
  [-12.50, -68.65],
  [-11.02, -68.75],
  [-9.67, -65.37],
];

// Bolivian departments with coordinates and danger rating
const DEPARTMENTS = [
  { id: "cbba", name: "Cochabamba", lat: -17.389, lng: -66.156, risk: "CRÍTICO", color: 0xff334b },
  { id: "scz", name: "Santa Cruz", lat: -17.783, lng: -63.182, risk: "ALTO", color: 0xff9900 },
  { id: "beni", name: "Beni", lat: -14.833, lng: -64.900, risk: "ALTO", color: 0xff9900 },
  { id: "lpz", name: "La Paz", lat: -16.500, lng: -68.150, risk: "MEDIO", color: 0x00e5ff },
  { id: "pando", name: "Pando", lat: -11.020, lng: -68.750, risk: "BAJO", color: 0x10b981 },
  { id: "oruro", name: "Oruro", lat: -17.964, lng: -67.114, risk: "MEDIO", color: 0x00e5ff },
  { id: "potosi", name: "Potosí", lat: -19.583, lng: -65.753, risk: "BAJO", color: 0x10b981 },
  { id: "chuq", name: "Chuquisaca", lat: -19.043, lng: -65.259, risk: "MEDIO", color: 0xf59e0b },
  { id: "tarija", name: "Tarija", lat: -21.535, lng: -64.734, risk: "ALTO", color: 0xff5252 },
];

// Create procedural high-definition Earth texture on HTML5 canvas
function createEarthCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Deep space ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, "#020b18");
  oceanGrad.addColorStop(0.5, "#061833");
  oceanGrad.addColorStop(1, "#020814");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Digital latitude & longitude grid lines (HUD graticule)
  ctx.strokeStyle = "rgba(0, 229, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let lat = 0; lat <= canvas.height; lat += 64) {
    ctx.beginPath();
    ctx.moveTo(0, lat);
    ctx.lineTo(canvas.width, lat);
    ctx.stroke();
  }
  for (let lon = 0; lon <= canvas.width; lon += 64) {
    ctx.beginPath();
    ctx.moveTo(lon, 0);
    ctx.lineTo(lon, canvas.height);
    ctx.stroke();
  }

  // Draw continents with high-tech contours
  ctx.fillStyle = "rgba(16, 185, 129, 0.28)"; // Tactical Emerald base
  ctx.strokeStyle = "#00e5ff"; // Glowing cyan coastlines
  ctx.lineWidth = 1.5;

  const continents: [number, number][][] = [
    // South America (Focus area)
    [
      [0.28, 0.52], [0.35, 0.53], [0.39, 0.58], [0.41, 0.65], [0.38, 0.75],
      [0.35, 0.85], [0.33, 0.92], [0.31, 0.88], [0.29, 0.78], [0.27, 0.68],
      [0.26, 0.58], [0.28, 0.52]
    ],
    // North America
    [
      [0.12, 0.15], [0.26, 0.15], [0.32, 0.25], [0.28, 0.38], [0.24, 0.48],
      [0.18, 0.45], [0.15, 0.35], [0.10, 0.25], [0.12, 0.15]
    ],
    // Eurasia
    [
      [0.48, 0.15], [0.75, 0.15], [0.88, 0.22], [0.82, 0.45], [0.72, 0.48],
      [0.65, 0.40], [0.55, 0.48], [0.46, 0.35], [0.48, 0.15]
    ],
    // Africa
    [
      [0.48, 0.42], [0.58, 0.42], [0.63, 0.52], [0.58, 0.72], [0.52, 0.78],
      [0.46, 0.65], [0.44, 0.50], [0.48, 0.42]
    ],
    // Australia
    [
      [0.80, 0.65], [0.88, 0.65], [0.90, 0.75], [0.85, 0.82], [0.78, 0.78], [0.80, 0.65]
    ]
  ];

  continents.forEach(poly => {
    ctx.beginPath();
    poly.forEach(([nx, ny], idx) => {
      const x = nx * canvas.width;
      const y = ny * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Highlight Bolivia's exact polygon contour on the texture
  ctx.beginPath();
  BOLIVIA_BORDER.forEach(([lat, lng], idx) => {
    const x = ((lng + 180) / 360) * canvas.width;
    const y = ((90 - lat) / 180) * canvas.height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Glowing city lights on dark side
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  for (let i = 0; i < 300; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    ctx.fillRect(rx, ry, 1.2, 1.2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

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

  // References for Three.js state that needs updates inside animation loop
  const progressRef = useRef(initialProgress);
  progressRef.current = diveProgress;

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  // Cinematic Auto-Dive Playback
  useEffect(() => {
    if (!isPlayingDive) return;

    let startTime = performance.now();
    const durationMs = 3800; // 3.8s cinematic fly-through
    const startProgress = progressRef.current;
    const targetProgress = startProgress >= 0.95 ? 0 : 1;

    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // Smooth cubic easing
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

  // Handle Wheel Scroll on Globe Canvas to scrub the dive directly
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * 0.0012;
    setDiveProgress((prev) => Math.max(0, Math.min(1, prev + delta)));
  }, []);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Starfield Particle Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 180;
      starPositions[i + 1] = (Math.random() - 0.5) * 180;
      starPositions[i + 2] = (Math.random() - 0.5) * 180;
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.65,
      transparent: true,
      opacity: 0.7,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // 3. Main 3D Earth Globe
    const globeRadius = 7.5;
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const earthTexture = createEarthCanvasTexture();
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpScale: 0.12,
      specular: new THREE.Color(0x00e5ff),
      shininess: 30,
      emissive: new THREE.Color(0x040e24),
      emissiveIntensity: 0.45,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // 4. Glowing Atmosphere Rim (Fresnel outer shell)
    const glowGeo = new THREE.SphereGeometry(globeRadius * 1.045, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    earthGroup.add(glowMesh);

    // Inner atmospheric haze shell (intensifies during descent t=0.4..0.8)
    const hazeGeo = new THREE.SphereGeometry(globeRadius * 1.018, 64, 64);
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const hazeMesh = new THREE.Mesh(hazeGeo, hazeMat);
    earthGroup.add(hazeMesh);

    // 5. 3D Glowing Vector Boundary for BOLIVIA
    const borderPoints: THREE.Vector3[] = BOLIVIA_BORDER.map(([lat, lng]) =>
      latLngToVec3(lat, lng, globeRadius * 1.004)
    );
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.95,
    });
    const boliviaBorderLine = new THREE.LineLoop(borderGeo, borderMat);
    earthGroup.add(boliviaBorderLine);

    // 6. Department Nodes on the 3D Globe
    const deptGroup = new THREE.Group();
    earthGroup.add(deptGroup);

    DEPARTMENTS.forEach((dept) => {
      const pos = latLngToVec3(dept.lat, dept.lng, globeRadius * 1.003);

      // Node ring
      const ringGeo = new THREE.RingGeometry(0.12, 0.22, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: dept.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      deptGroup.add(ringMesh);

      // Node dot
      const dotGeo = new THREE.SphereGeometry(0.06, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      deptGroup.add(dotMesh);
    });

    // 7. 4 Orbital NASA Satellite Paths & Models (TERRA, AQUA, SUOMI-NPP, NOAA-20)
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const orbitConfigs = [
      { radius: 10.4, tiltX: 0.45, tiltZ: 0.2, color: 0x00f0ff, speed: 0.009, satName: "TERRA (MODIS)" },
      { radius: 11.6, tiltX: -0.65, tiltZ: -0.35, color: 0x38bdf8, speed: 0.007, satName: "AQUA (MODIS)" },
      { radius: 12.8, tiltX: 0.85, tiltZ: 0.75, color: 0x10b981, speed: 0.011, satName: "SUOMI-NPP (VIIRS)" },
      { radius: 14.2, tiltX: -0.3, tiltZ: 0.9, color: 0xf59e0b, speed: 0.008, satName: "NOAA-20 (VIIRS)" },
    ];

    const satellites: { mesh: THREE.Mesh; angle: number; speed: number; radius: number; group: THREE.Group }[] = [];

    orbitConfigs.forEach((cfg) => {
      const ringGeo = new THREE.RingGeometry(cfg.radius - 0.03, cfg.radius + 0.03, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const orbitRing = new THREE.Mesh(ringGeo, ringMat);
      orbitRing.rotation.x = Math.PI / 2 + cfg.tiltX;
      orbitRing.rotation.z = cfg.tiltZ;

      const subGroup = new THREE.Group();
      subGroup.add(orbitRing);

      // Satellite body
      const satGeo = new THREE.BoxGeometry(0.35, 0.2, 0.2);
      const satMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      const satMesh = new THREE.Mesh(satGeo, satMat);

      // Solar panels
      const panelGeo = new THREE.BoxGeometry(0.8, 0.05, 0.15);
      const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const panelMesh = new THREE.Mesh(panelGeo, panelMat);
      satMesh.add(panelMesh);

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

    // 8. 3D Laser Fire Pillars on Active Thermal Hotspots
    const fireGroup = new THREE.Group();
    earthGroup.add(fireGroup);

    const fireRings: { mesh: THREE.Mesh; baseScale: number }[] = [];

    incidents.forEach((inc) => {
      const pos = latLngToVec3(inc.lat, inc.lng, globeRadius);

      // Vertical radiant light beam shooting out from earth
      const beamHeight = 1.4 + (inc.frp ? Math.min(inc.frp / 18, 3.0) : 0.9);
      const beamGeo = new THREE.CylinderGeometry(0.04, 0.12, beamHeight, 8);
      const isHarmonized = inc.source === "MODIS+VIIRS armonizado";
      const beamColor = isHarmonized ? 0x00f0ff : 0xff334b;

      const beamMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        transparent: true,
        opacity: 0.9,
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);

      beamMesh.position.copy(pos.clone().multiplyScalar(1 + (beamHeight / 2) / globeRadius));
      beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      fireGroup.add(beamMesh);

      // Pulsing thermal shockwave ring on surface
      const flareGeo = new THREE.RingGeometry(0.08, 0.32, 20);
      const flareMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const flareMesh = new THREE.Mesh(flareGeo, flareMat);
      flareMesh.position.copy(pos.clone().multiplyScalar(1.006));
      flareMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      fireGroup.add(flareMesh);

      fireRings.push({ mesh: flareMesh, baseScale: 1.0 });
    });

    // 9. Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0x0a1f3d, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(22, 14, 16);
    scene.add(sunLight);

    const blueBackLight = new THREE.PointLight(0x00e5ff, 4.0, 60);
    blueBackLight.position.set(-18, -12, -12);
    scene.add(blueBackLight);

    // 10. Coordinates of Bolivia and Camera Targets
    // Bolivia center: -16.8 lat, -65.0 lon
    const boliviaVec = latLngToVec3(-16.8, -65.0, globeRadius);

    // Camera positions:
    // Orbit space: (0, 3, 24)
    // Bolivia tactical close-up: Hovering radially 1.7 units above Bolivia (radius 7.5 + 1.7 = 9.2)
    const spaceCamPos = new THREE.Vector3(0, 3, 24);
    const boliviaCamPos = boliviaVec.clone().normalize().multiplyScalar(9.2);

    const spaceLookAt = new THREE.Vector3(0, 0, 0);
    const boliviaLookAt = boliviaVec.clone();

    // 11. Mouse Drag to Orbit freely at any zoom level
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      earthGroup.rotation.y += dx * 0.005;
      earthGroup.rotation.x += dy * 0.005;

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 12. Animation Loop with Camera Interpolation
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const p = progressRef.current; // 0..1

      // Auto rotation in space when progress is low and not dragging
      if (autoRotateRef.current && !isDragging && p < 0.1) {
        earthGroup.rotation.y += 0.0016;
      } else if (p >= 0.1 && !isDragging) {
        // Smoothly orient Earth so Bolivia vector lines up straight with target
        earthGroup.rotation.y = THREE.MathUtils.lerp(earthGroup.rotation.y, 0, 0.05);
        earthGroup.rotation.x = THREE.MathUtils.lerp(earthGroup.rotation.x, 0, 0.05);
      }

      // Smooth camera interpolation based on dive progress
      // Cubic easing for cinematic swoop
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      camera.position.lerpVectors(spaceCamPos, boliviaCamPos, ease);
      const currentLookAt = new THREE.Vector3().lerpVectors(spaceLookAt, boliviaLookAt, ease);
      camera.lookAt(currentLookAt);

      // Atmospheric haze opacity modulation
      if (p > 0.25 && p < 0.75) {
        hazeMat.opacity = THREE.MathUtils.lerp(0.08, 0.45, Math.sin((p - 0.25) * Math.PI * 2));
      } else {
        hazeMat.opacity = 0.08;
      }

      // Animate fire rings pulsing
      const ringScale = 1 + Math.sin(elapsed * 4) * 0.25;
      fireRings.forEach((r) => {
        r.mesh.scale.set(ringScale, ringScale, ringScale);
      });

      // Animate satellites around their orbits
      satellites.forEach((sat) => {
        sat.angle += sat.speed;
        const x = Math.cos(sat.angle) * sat.radius;
        const y = Math.sin(sat.angle) * sat.radius;
        sat.mesh.position.set(x, y, 0);
      });

      // Subtle starfield twinkling
      stars.rotation.y += 0.0002;

      renderer.render(scene, camera);
    };

    animate();

    // 13. Responsive Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
      renderer.dispose();
    };
  }, [incidents]);

  // Altitude calculation for HUD display
  // 0% -> 820 km (LEO Orbit)
  // 35% -> 150 km (Termosfera)
  // 70% -> 45 km (Estratosfera)
  // 100% -> 4.5 km (Espacio Aéreo Táctico Bolivia)
  const currentAltitudeKm = Math.round(
    THREE.MathUtils.lerp(820, 4.5, diveProgress)
  );

  const altitudeStage =
    diveProgress < 0.25
      ? "ÓRBITA LEO GEOESTACIONARIA"
      : diveProgress < 0.55
      ? "INGRESO A LA TERMOSFERA"
      : diveProgress < 0.85
      ? "ESTRATOSFERA · ESPACIO AÉREO NACIONAL"
      : "ESPACIO AÉREO TÁCTICO · BOLIVIA";

  return (
    <div
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none bg-[#030712] ${className}`}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* =========================================================
          TOP HUD OVERLAY: DYNAMIC ALTITUDE & MISSION READOUT
         ========================================================= */}
      <div className="pointer-events-none absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Altitude & Stage */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-500/30 bg-slate-950/80 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.2)]">
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
              OBJETIVO: BOLIVIA · {incidents.length} FOCOS ACTIVOS
            </div>
            <div className="font-mono text-[9px] text-slate-400">
              COCHABAMBA (-17.389°, -66.156°) · PARQUE TUNARI
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CENTER FLOATING TARGET PIN (VISIBLE DURING FLIGHT)
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
        {/* Preset Stage Buttons (Órbita -> Estratosfera -> Bolivia -> Tunari) */}
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
            onClick={() => setDiveProgress(0.4)}
            className={`rounded-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              diveProgress >= 0.2 && diveProgress < 0.65
                ? "border border-cyan-400/70 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ☁️ Estratosfera (150 km)
          </button>
          <button
            onClick={() => setDiveProgress(0.8)}
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

          {/* Switch to 2D Submetric Tactical Map */}
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
