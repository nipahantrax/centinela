# 🛰️ CENTINELA · Plataforma Táctica de Alerta Temprana, Armonización Satelital y Despacho Operativo
### Gobierno Autónomo Municipal de Cochabamba (GAMC) · Parque Nacional Tunari · NASA Space Apps Challenge 2026
**Desafío Oficial NASA:** *Harmonization of MODIS and VIIRS Hot Spots*

---

## 📖 Visión y Misión del Proyecto

> *"El problema en Cochabamba no es detectar el fuego: es llegar a tiempo antes de que suba a las cumbres del Tunari. Lamentarse es peligroso."*

**CENTINELA** es un Centro de Mando Táctico B2G (*Business-to-Government*) y Sistema de Alerta Temprana de Incendios Forestales diseñado específicamente para la topografía y vulnerabilidad de los **11 municipios del Parque Nacional Tunari** (Cercado, Sacaba, Quillacollo, Tiquipaya, Colcapirhua, Vinto, Sipe Sipe, Colomi, Villa Tunari, Tapacarí y Morochata) y extensible a los **9 departamentos de Bolivia**.

El sistema supera las limitaciones de los visores reactivos convencionales mediante un **motor 100% preventivo** que cruza:
1. **Telemetría Satelital Multiespectral en Tiempo Real:** Constelaciones NASA FIRMS (MODIS Terra/Aqua + VIIRS Suomi-NPP / NOAA-20 / NOAA-21), NASA POWER, NASA GIBS y NASA EONET.
2. **Pronóstico Meteorológico Predictivo:** Días acumulados de sequía y ráfagas extremas vía Microsoft Weather API y NASA POWER.
3. **Física Termodinámica y Botánica Pirogénica:** Regla del 30-30-30, punto de ignición celulósico (300 °C) y multiplicadores de inflamabilidad por especie vegetal (Ichu, Pino, Eucalipto, Kewiña nativa).
4. **Logística Municipal de Respuesta Rápida:** Red geolocalizada de tomas de agua, hidrantes de alta presión y puntos de cisterna municipal GAMC para lograr una llegada de respuesta táctica en $\le 25\text{ minutos}$.

---

## 🎯 Desafío NASA: Armonización MODIS + VIIRS

El reto oficial de la NASA exige armonizar las lecturas radiométricas entre dos generaciones de sensores:
* **MODIS (Terra / Aqua):** Resolución espacial de 1.000m (Banda 4µm). Provee más de 20 años de registro continuo e ininterrumpido.
* **VIIRS (Suomi-NPP / NOAA-20 / NOAA-21):** Resolución espacial de 375m (I-Band 3.74µm). Permite detectar incendios incipientes y perfilar bordes con alta precisión.

### 🧠 Algoritmo de Armonización (`src/lib/harmonization.ts`)
* **Detección Cruzada Geodésica:** Ventana espaciotemporal de coincidencia $\le 600\text{ m}$ y $\le 2\text{ horas}$.
* **Reubicación de Centroide:** Ajusta automáticamente la coordenada al centroide de 375m del sensor VIIRS.
* **Reducción de Falsos Positivos:** Eleva la confianza estadística combinada a $>90\%$ (típicamente $94\% - 99\%$) y reduce las falsas alarmas a $<1\%$.
* **Cálculo Radiométrico Integrado:** Suma e integra la Potencia Radiativa del Fuego (FRP en Megavatios) y traduce la temperatura de brillo a demanda hídrica de extinción en litros por minuto.

---

## ⚡ Capacidades de Ingeniería y Operación

### 1. Motor de Clustering WebGL Acelerado por GPU (`src/lib/webgl-clustering.ts`)
* **60 FPS Constantes:** Capaz de renderizar fluidamente más de **63.500+ anomalías térmicas simultáneas** mediante shaders WebGL nativos y fallback a Canvas 2D.
* **Clustering Dinámico por Zoom:** A escala nacional (`zoom <= 11`) agrupa los focos en clústeres térmicos con agregación radiométrica (FRP total, severidad y conteo). A escala municipal (`zoom >= 12`), desagrega individualmente cada foco a 375m de resolución.

### 2. Inspector Táctico y Ficha ICS-209 para Bomberos
* **Despacho Inmediato por WhatsApp:** Con un solo clic, genera y despacha la ficha oficial ICS-209 preformateada hacia brigadistas en terreno, Bomberos 119, SAR Bolivia y la UGR del GAMC.
* **Ruta de Acceso e Hidrante:** Identificación geodésica del hidrante o punto de agua más cercano y estado de habilitación de caminos para autobombas.
* **Demanda Hídrica Estimada:** Cálculo cuantitativo de litros de agua requeridos y número de cisternas necesarias según el FRP del foco.

### 3. Exportación Geoespacial Abierta para Municipios
* **Descarga GeoJSON SIG:** Exporta las capas térmicas vectoriales para su importación inmediata en QGIS o ArcGIS por parte de las direcciones de medio ambiente y planificación municipal.
* **Exportación CSV:** Formato tabular para auditoría institucional post-evento.
* **Sellado Criptográfico SHA-256:** Garantiza la inmutabilidad y trazabilidad legal de cada informe generado.

---

## 🛠️ Stack Tecnológico de Grado Aeroespacial

| Capa | Tecnologías |
| :--- | :--- |
| **Arquitectura Web** | [TanStack Start](https://tanstack.com/start) (React 19, TypeScript 5.8, SSR Vite) |
| **Estilos & Diseño Adaptativo** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons |
| **Cartografía y GPU** | Leaflet, Leaflet.VectorGrid, WebGL Shaders, Turf.js, Esri World Imagery |
| **Ingesta de Satélites** | NASA FIRMS (MODIS/VIIRS), NASA POWER, NASA GIBS, NASA EONET |
| **Predicción Meteorológica** | Microsoft Weather API + Telemetría Agro-meteorológica NASA POWER |
| **Testing y Calidad** | Vitest (48/48 tests unitarios pasando al 100%) y TypeScript (`tsc --noEmit` con 0 errores) |

---

## 🚀 Instalación y Puesta en Marcha

```bash
# 1. Clonar el repositorio
git clone https://github.com/nipahantrax/centinela.git
cd centinela/centinelas

# 2. Instalar dependencias del proyecto
npm install

# 3. Configurar variables de entorno
# Configura tu clave de NASA FIRMS en .env (se provee .env.example)
cp .env.example .env

# 4. Iniciar servidor de desarrollo en local
npm run dev

# 5. Ejecutar suite completa de pruebas unitarias
npm test
```

Abre en tu navegador: [http://localhost:8080/dashboard](http://localhost:8080/dashboard)

---

## 🗺️ Estructura del Repositorio

```
centinelas/
├── public/                     # Recursos estáticos y manifiesto
├── src/
│   ├── components/
│   │   ├── centinela/          # Componentes tácticos (TacticalMap, RiskGauge, WebGLThermalLayer, etc.)
│   │   └── ui/                 # Primitivas de UI Radix accesibles
│   ├── data/                   # Polígonos vectoriales ADM1 de Bolivia
│   ├── hooks/                  # useNasa, use-mobile, etc.
│   ├── lib/
│   │   ├── centinela-data.ts   # Nodos de los 11 municipios del Tunari, botánica y cisternas
│   │   ├── fire-indices.ts     # Física de ignición, regla 30-30-30, índice Ångström
│   │   ├── fire-operations.ts  # Rutas de hidrantes, proyección de frentes de fuego
│   │   ├── harmonization.ts    # Algoritmo de fusión MODIS + VIIRS
│   │   ├── nasa-data.ts        # Parsers FIRMS, POWER, EONET, GIBS
│   │   ├── nasa-queries.ts     # Consultas cacheadas TanStack Query
│   │   └── webgl-clustering.ts # Spatial Grid KD-Tree en GPU WebGL
│   ├── routes/
│   │   ├── __root.tsx          # Shell principal y Toaster
│   │   ├── dashboard.tsx       # Centro de Mando Táctico Widescreen (PC/Desktop)
│   │   ├── movil.tsx           # Vista móvil de respuesta rápida en terreno
│   │   ├── alerta.$id.tsx      # Ficha técnica individual de foco térmico
│   │   ├── reportes.tsx        # Auditoría analítica y exportación GeoJSON/CSV
│   │   ├── proyecto.tsx        # Documentación de arquitectura técnica municipal GAMC
│   │   └── publico.tsx         # Portal ciudadano de libre acceso
│   └── test/                   # 7 suites de pruebas unitarias (Vitest)
├── vitest.config.ts            # Configuración de pruebas unitarias
└── tsconfig.json               # Configuración estricta de TypeScript
```

---

## 👥 Créditos y Participación
* **Proyecto:** Operación CENTINELA
* **Autor:** Rodrigo Abel
* **Organización:** Lextech Academy
* **Evento:** NASA Space Apps Challenge Cochabamba 2026
* **Ámbito de Aplicación:** Gobierno Autónomo Municipal de Cochabamba (GAMC) y Parque Nacional Tunari
