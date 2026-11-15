import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import type { HotspotCluster } from "@/lib/webgl-clustering";

interface WebGLThermalLayerProps {
  map: Leaflet.Map | null;
  clusters: HotspotCluster[];
  enabled: boolean;
  heatmapEnabled: boolean;
  windFlowEnabled: boolean;
  wind: { deg: number; kmh: number };
  center: [number, number];
}

const VS_SOURCE = `
attribute vec2 a_position;
attribute float a_pointSize;
attribute float a_intensity;
attribute float a_harmonized;
attribute float a_critical;

varying float v_intensity;
varying float v_harmonized;
varying float v_critical;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  gl_PointSize = a_pointSize;
  v_intensity = a_intensity;
  v_harmonized = a_harmonized;
  v_critical = a_critical;
}
`;

const FS_SOURCE = `
precision mediump float;
uniform float u_time;
uniform float u_heatmap;

varying float v_intensity;
varying float v_harmonized;
varying float v_critical;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float pulse = 0.5 + 0.5 * sin(u_time * 4.0);
  float ring = smoothstep(0.48, 0.44, dist) * smoothstep(0.34, 0.38, dist);

  vec3 fireColor = vec3(0.95, 0.22, 0.12);
  vec3 amberCore = vec3(1.0, 0.75, 0.2);
  vec3 harmonizedCyan = vec3(0.15, 0.85, 0.95);

  vec3 color = mix(fireColor, amberCore, v_intensity * 0.7);
  if (v_harmonized > 0.5) {
    color = mix(color, harmonizedCyan, 0.35);
  }
  if (v_critical > 0.5) {
    color = mix(color, vec3(1.0, 0.1, 0.1), pulse * 0.4);
  }

  float alpha = smoothstep(0.5, 0.05, dist) * (0.65 + 0.35 * v_intensity);
  if (u_heatmap > 0.5) {
    alpha = smoothstep(0.5, 0.0, dist) * 0.4;
  }

  gl_FragColor = vec4(color + ring * pulse * 0.35, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function WebGLThermalLayer({
  map,
  clusters,
  enabled,
  heatmapEnabled,
  windFlowEnabled,
  wind,
  center,
}: WebGLThermalLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const isWebGLRef = useRef(false);

  // Buffer de partículas de viento
  const windParticlesRef = useRef<Array<{ x: number; y: number; life: number; maxLife: number }>>([]);

  useEffect(() => {
    if (!map || !enabled) {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.parentElement.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
      return;
    }

    const container = map.getContainer();
    if (!container) return;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "pointer-events-none";
      canvas.style.position = "absolute";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.zIndex = "400";
      container.appendChild(canvas);
      canvasRef.current = canvas;

      // Intentar inicializar WebGL
      try {
        const gl = (canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

        if (gl) {
          const vs = compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
          const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
          if (vs && fs) {
            const prog = gl.createProgram();
            if (prog) {
              gl.attachShader(prog, vs);
              gl.attachShader(prog, fs);
              gl.linkProgram(prog);
              if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                progRef.current = prog;
                glRef.current = gl;
                isWebGLRef.current = true;
              }
            }
          }
        }
      } catch {
        isWebGLRef.current = false;
      }
    }

    // Inicializar partículas de viento
    if (windFlowEnabled && windParticlesRef.current.length === 0) {
      windParticlesRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random(),
        y: Math.random(),
        life: Math.random() * 60,
        maxLife: 60 + Math.random() * 60,
      }));
    }

    const updateCanvas = () => {
      if (!canvas || !map) return;
      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;
      const w = size.x;
      const h = size.y;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      renderFrame();
    };

    const renderFrame = () => {
      if (!canvas || !map) return;
      try {
        const pane = (map as unknown as { _mapPane?: { _leaflet_pos?: unknown } })._mapPane;
        if (!pane || !pane._leaflet_pos) return;
        const size = map.getSize();
        if (!size || size.x <= 0 || size.y <= 0) return;
        const gl = glRef.current;
        const isWebGL = isWebGLRef.current && gl && progRef.current;
        const dpr = window.devicePixelRatio || 1;
        const width = size.x * dpr;
        const height = size.y * dpr;
        const time = performance.now() * 0.001;

        if (isWebGL && gl && progRef.current) {
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(progRef.current);

        // Uniforms
        const uTimeLoc = gl.getUniformLocation(progRef.current, "u_time");
        const uHeatmapLoc = gl.getUniformLocation(progRef.current, "u_heatmap");
        if (uTimeLoc) gl.uniform1f(uTimeLoc, time);
        if (uHeatmapLoc) gl.uniform1f(uHeatmapLoc, heatmapEnabled ? 1.0 : 0.0);

        // Transformar clusters a clip space
        const pointsData: number[] = [];
        for (const c of clusters) {
          const pt = map.latLngToContainerPoint([c.lat, c.lng]);
          // Clip space [-1, 1]
          const clipX = (pt.x / size.x) * 2 - 1;
          const clipY = -((pt.y / size.y) * 2 - 1);
          const baseSize = heatmapEnabled
            ? Math.min(120, Math.max(30, c.maxFRP * 2.5 + 24))
            : Math.min(54, Math.max(14, c.totalHotspots * 4 + 12));

          pointsData.push(
            clipX,
            clipY,
            baseSize * dpr,
            Math.min(1.0, c.maxFRP / 70),
            c.harmonizedCount > 0 ? 1.0 : 0.0,
            c.dominantRiskLevel === "CRITICO" ? 1.0 : 0.0
          );
        }

        if (pointsData.length > 0) {
          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsData), gl.DYNAMIC_DRAW);

          const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
          const aPosLoc = gl.getAttribLocation(progRef.current, "a_position");
          const aSizeLoc = gl.getAttribLocation(progRef.current, "a_pointSize");
          const aIntLoc = gl.getAttribLocation(progRef.current, "a_intensity");
          const aHarmLoc = gl.getAttribLocation(progRef.current, "a_harmonized");
          const aCritLoc = gl.getAttribLocation(progRef.current, "a_critical");

          if (aPosLoc >= 0) {
            gl.enableVertexAttribArray(aPosLoc);
            gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, stride, 0);
          }
          if (aSizeLoc >= 0) {
            gl.enableVertexAttribArray(aSizeLoc);
            gl.vertexAttribPointer(aSizeLoc, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
          }
          if (aIntLoc >= 0) {
            gl.enableVertexAttribArray(aIntLoc);
            gl.vertexAttribPointer(aIntLoc, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
          }
          if (aHarmLoc >= 0) {
            gl.enableVertexAttribArray(aHarmLoc);
            gl.vertexAttribPointer(aHarmLoc, 1, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
          }
          if (aCritLoc >= 0) {
            gl.enableVertexAttribArray(aCritLoc);
            gl.vertexAttribPointer(aCritLoc, 1, gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);
          }

          gl.drawArrays(gl.POINTS, 0, clusters.length);
          gl.deleteBuffer(buffer);
        }
      } else {
        // Fallback transparente a Canvas 2D
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          for (const c of clusters) {
            const pt = map.latLngToContainerPoint([c.lat, c.lng]);
            const r = heatmapEnabled
              ? Math.min(60, Math.max(16, c.maxFRP * 1.5 + 12))
              : Math.min(26, Math.max(7, c.totalHotspots * 2 + 6));

            const grad = ctx.createRadialGradient(pt.x * dpr, pt.y * dpr, 0, pt.x * dpr, pt.y * dpr, r * dpr);
            if (c.dominantRiskLevel === "CRITICO") {
              grad.addColorStop(0, "rgba(239, 68, 68, 0.95)");
              grad.addColorStop(0.7, "rgba(249, 115, 22, 0.4)");
              grad.addColorStop(1, "rgba(239, 68, 68, 0)");
            } else if (c.harmonizedCount > 0) {
              grad.addColorStop(0, "rgba(6, 182, 212, 0.9)");
              grad.addColorStop(0.7, "rgba(14, 165, 233, 0.4)");
              grad.addColorStop(1, "rgba(6, 182, 212, 0)");
            } else {
              grad.addColorStop(0, "rgba(245, 158, 11, 0.85)");
              grad.addColorStop(0.8, "rgba(234, 88, 12, 0.35)");
              grad.addColorStop(1, "rgba(245, 158, 11, 0)");
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x * dpr, pt.y * dpr, r * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Renderizar partículas de viento si están activas
      if (windFlowEnabled && canvas) {
        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          const rad = ((wind.deg + 180) % 360) * (Math.PI / 180);
          const spd = Math.max(1, (wind.kmh / 40) * 3);
          const dx = Math.sin(rad) * spd * dpr;
          const dy = -Math.cos(rad) * spd * dpr;

          ctx2d.strokeStyle = "rgba(56, 189, 248, 0.35)";
          ctx2d.lineWidth = 1.5 * dpr;

          for (const p of windParticlesRef.current) {
            p.x = (p.x + dx / width + 1) % 1;
            p.y = (p.y + dy / height + 1) % 1;
            p.life++;
            if (p.life > p.maxLife) {
              p.x = Math.random();
              p.y = Math.random();
              p.life = 0;
            }

            const px = p.x * width;
            const py = p.y * height;
            ctx2d.beginPath();
            ctx2d.moveTo(px, py);
            ctx2d.lineTo(px + dx * 2.5, py + dy * 2.5);
            ctx2d.stroke();
          }
        }
      }
    } catch {
      // Ignorar errores transitorios durante pane unmount o transiciones
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
  };

    map.on("move", updateCanvas);
    map.on("zoom", updateCanvas);
    map.on("resize", updateCanvas);
    map.on("viewreset", updateCanvas);

    updateCanvas();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      map.off("move", updateCanvas);
      map.off("zoom", updateCanvas);
      map.off("resize", updateCanvas);
      map.off("viewreset", updateCanvas);
      if (canvas && canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
        canvasRef.current = null;
      }
    };
  }, [map, clusters, enabled, heatmapEnabled, windFlowEnabled, wind.deg, wind.kmh, center]);

  return null;
}
