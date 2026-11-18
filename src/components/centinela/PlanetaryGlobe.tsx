import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { type Incident } from "@/lib/centinela-data";
import { Sparkles, Compass, Eye, RotateCw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Props {
  incidents: Incident[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
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

// Create a high-tech procedural Earth texture on an HTML5 canvas
function createEarthCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Deep ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, "#051329");
  oceanGrad.addColorStop(0.5, "#081d3d");
  oceanGrad.addColorStop(1, "#040e20");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Digital latitude & longitude grid lines (HUD style)
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

  // Draw simplified landmasses with high-tech contours
  ctx.fillStyle = "rgba(16, 185, 129, 0.28)"; // Tactical Emerald continent base
  ctx.strokeStyle = "#00e5ff"; // Glowing cyan coastlines
  ctx.lineWidth = 1.5;

  // Approximate major continental shapes (normalized coordinates [x, y] on equirectangular projection)
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

  // Highlight Bolivia / Tunari region in South America
  const boliviaX = 0.315 * canvas.width;
  const boliviaY = 0.68 * canvas.height;
  const boliviaGrad = ctx.createRadialGradient(boliviaX, boliviaY, 5, boliviaX, boliviaY, 40);
  boliviaGrad.addColorStop(0, "rgba(255, 51, 75, 0.8)");
  boliviaGrad.addColorStop(0.4, "rgba(255, 153, 0, 0.4)");
  boliviaGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
  ctx.fillStyle = boliviaGrad;
  ctx.beginPath();
  ctx.arc(boliviaX, boliviaY, 40, 0, Math.PI * 2);
  ctx.fill();

  // Tech dots for major world cities
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 200; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    ctx.fillRect(rx, ry, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function PlanetaryGlobe({ incidents, selectedId, onSelect, className = "" }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeFocoCount, setActiveFocoCount] = useState(incidents.length);

  useEffect(() => {
    setActiveFocoCount(incidents.length);
  }, [incidents]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 3, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Starfield Particle Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 160;
      starPositions[i + 1] = (Math.random() - 0.5) * 160;
      starPositions[i + 2] = (Math.random() - 0.5) * 160;
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.6,
      transparent: true,
      opacity: 0.65,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // 3. Main 3D Earth Globe Mesh
    const globeRadius = 7.5;
    const earthGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const earthTexture = createEarthCanvasTexture();
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpScale: 0.1,
      specular: new THREE.Color(0x00e5ff),
      shininess: 25,
      emissive: new THREE.Color(0x040e24),
      emissiveIntensity: 0.4,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Rotate Earth initially so South America / Bolivia faces the camera
    earthMesh.rotation.y = 1.15;
    earthMesh.rotation.x = 0.25;

    // 4. Atmospheric Glowing Outer Halo (Fresnel effect)
    const glowGeo = new THREE.SphereGeometry(globeRadius * 1.045, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowMesh);

    // 5. Orbital Satellite Trajectory Rings (MODIS & VIIRS constelations)
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const orbitConfigs = [
      { radius: 10.2, tiltX: 0.45, tiltZ: 0.2, color: 0x00f0ff, speed: 0.008, satName: "TERRA (MODIS)" },
      { radius: 11.5, tiltX: -0.65, tiltZ: -0.35, color: 0x38bdf8, speed: 0.006, satName: "AQUA (MODIS)" },
      { radius: 12.8, tiltX: 0.85, tiltZ: 0.75, color: 0x10b981, speed: 0.01, satName: "SUOMI-NPP (VIIRS)" },
      { radius: 14.0, tiltX: -0.3, tiltZ: 0.9, color: 0xf59e0b, speed: 0.007, satName: "NOAA-20 (VIIRS)" },
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

    // 6. Glowing Fire Flare Beacons on the Globe (Incident Points)
    const fireGroup = new THREE.Group();
    earthMesh.add(fireGroup); // Attach to earthMesh so they rotate with the planet

    incidents.forEach((inc) => {
      const pos = latLngToVec3(inc.lat, inc.lng, globeRadius);
      
      // Radiant pillar beam shooting out from earth
      const beamHeight = 1.2 + (inc.frp ? Math.min(inc.frp / 20, 2.5) : 0.8);
      const beamGeo = new THREE.CylinderGeometry(0.04, 0.12, beamHeight, 8);
      const isHarmonized = inc.source === "MODIS+VIIRS armonizado";
      const beamColor = isHarmonized ? 0x00f0ff : 0xff334b;

      const beamMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        transparent: true,
        opacity: 0.85,
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);

      // Orient cylinder outward along normal
      beamMesh.position.copy(pos.clone().multiplyScalar(1 + (beamHeight / 2) / globeRadius));
      beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      fireGroup.add(beamMesh);

      // Glowing flare ring on surface
      const flareGeo = new THREE.RingGeometry(0.1, 0.35, 16);
      const flareMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const flareMesh = new THREE.Mesh(flareGeo, flareMat);
      flareMesh.position.copy(pos.clone().multiplyScalar(1.01));
      flareMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      fireGroup.add(flareMesh);
    });

    // 7. Ambient & Directional Space Lighting
    const ambientLight = new THREE.AmbientLight(0x0f274a, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(20, 12, 15);
    scene.add(sunLight);

    const blueBackLight = new THREE.PointLight(0x00e5ff, 3.5, 50);
    blueBackLight.position.set(-15, -10, -10);
    scene.add(blueBackLight);

    // 8. Interactive Mouse Drag & Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      earthMesh.rotation.y += deltaX * 0.005;
      earthMesh.rotation.x += deltaY * 0.005;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 9. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Slow auto rotation
      if (autoRotate && !isDragging) {
        earthMesh.rotation.y += 0.0018;
      }

      // Animate satellites around their orbital paths
      satellites.forEach((sat) => {
        sat.angle += sat.speed;
        const x = Math.cos(sat.angle) * sat.radius;
        const y = Math.sin(sat.angle) * sat.radius;
        sat.mesh.position.set(x, y, 0);
      });

      // Subtle starfield twinkling
      stars.rotation.y += 0.0003;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize handler
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
  }, [incidents, autoRotate]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Futuristic Target Pin over South America / Bolivia */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/50 bg-slate-950/80 px-4 py-1.5 font-mono text-xs font-bold text-cyan-300 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.4)]">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span>OBJETIVO ORBITAL: COCHABAMBA · PARQUE TUNARI</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-slate-400 tracking-wider">
          LAT: -17.389° · LON: -66.156° · ALT: 820 KM ORBIT
        </div>
      </div>

      {/* Telemetry Status Pills on Globe */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="glass rounded-xl px-3 py-1.5 border border-cyan-500/30 font-mono text-[10px] text-cyan-200">
          <span className="text-cyan-400 font-bold">4 CONSTELACIONES:</span> TERRA · AQUA · SUOMI-NPP · NOAA-20
        </div>
        <div className="glass rounded-xl px-3 py-1.5 border border-red-500/30 font-mono text-[10px] text-red-300">
          <span className="font-bold text-red-400">{activeFocoCount}</span> FOCOS EN ÓRBITA
        </div>
      </div>

      {/* Globe Interaction HUD Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-all duration-200 ${
            autoRotate
              ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
              : "border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white"
          }`}
        >
          <RotateCw className={`h-3.5 w-3.5 ${autoRotate ? "animate-spin" : ""}`} />
          <span>{autoRotate ? "Auto-Giro ON" : "Auto-Giro OFF"}</span>
        </button>
      </div>
    </div>
  );
}
