# 🛰️ CENTINELA · Plataforma Táctica de Alerta Temprana, Armonización Satelital y Despacho Operativo
### Gobierno Autónomo Municipal de Cochabamba (GAMC) · Parque Nacional Tunari · NASA Space Apps Challenge 2026
**Desafío Oficial NASA:** *Harmonization of MODIS and VIIRS Hot Spots*

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Producci%C3%B3n%20Activa-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://centinelas-seven.vercel.app)
[![Tests Passing](https://img.shields.io/badge/Vitest-65%2F65%20Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://centinelas-seven.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%200%20Errors-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://centinelas-seven.vercel.app)
[![i18n Multi-Language](https://img.shields.io/badge/i18n-ES%20%7C%20QU%20%7C%20EN-orange?style=for-the-badge&logo=google-translate&logoColor=white)](https://centinelas-seven.vercel.app)

🌐 **URL Oficial en Producción:** [https://centinelas-seven.vercel.app](https://centinelas-seven.vercel.app)  
🛰️ **Centro de Mando Táctico:** [https://centinelas-seven.vercel.app/dashboard](https://centinelas-seven.vercel.app/dashboard)  
📱 **Visor Táctico para Brigadistas:** [https://centinelas-seven.vercel.app/movil](https://centinelas-seven.vercel.app/movil)  

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

### 1. Sistema Trilingüe Reactivo en Tiempo Real (`src/lib/i18n.tsx`)
Conmutación reactiva instantánea sin recarga de página entre los 3 idiomas estratégicos del proyecto:
- **🇪🇸 Español (ES):** Para mandos del GAMC, Bomberos 119, SAR Bolivia y ciudadanía urbana.
- **🏔️ Quechua Boliviano / Runasimi (QU):** Lengua nativa valluna para comunarios, sindicatos agrarios y guardaparques SERNAP en las faldas del Tunari.
- **🇺🇸 English (EN):** Presentación técnica formal para el jurado evaluador global de NASA Space Apps Challenge.

### 2. Diseño Táctico Widescreen 1920px (Desktop Full-Width)
* **Distribución en 3 Columnas Reales:** 
  - **Columna Izquierda:** Velocímetro de riesgo unificado, telemetría NASA POWER, regla 30-30-30 y desglose botánico.
  - **Columna Central Gigante:** Cinta interactiva de 11 municipios y mapa táctico satelital de alto contraste.
  - **Columna Derecha:** Feed armonizado, calculadora de demanda hídrica, activación de sirena y despacho de ficha ICS-209.

### 3. Doble Ruteo de Alto Contraste (Acceso Terrestre + Extracción de Agua)
* **RUTA A (Oro/Ámbar Neón `#FFD700`):** Vía de acceso terrestre desde cuarteles o vías principales hasta el foco con cálculo de ETA en minutos y estado de transitabilidad.
* **RUTA B (Cian Fluorescente `#00E5FF` animado):** Vector directo hacia la fuente hídrica más cercana (ríos Rocha, Taquiña, Chocaya, lagunas Alalay/Angostura o hidrantes urbanos) indicando caudal activo y litros disponibles.

### 4. Estabilidad Cartográfica Absoluta Anti-Salto
Manejo riguroso de eventos con `lastTarget.current`, `stopPropagation()` y `autoPan: false` que impide que la cámara del mapa se reubique o salte involuntariamente al interactuar con marcadores en niveles de zoom profundo (`zoom >= 13`).

### 5. Motor de Clustering WebGL Acelerado por GPU (`src/lib/webgl-clustering.ts`)
* **60 FPS Constantes:** Capaz de renderizar fluidamente más de **63.500+ anomalías térmicas simultáneas** mediante shaders WebGL nativos y fallback a Canvas 2D.
* **Clustering Dinámico por Zoom:** A escala departamental agrupa en clústeres térmicos con agregación radiométrica; a escala municipal desagrega a resolución nominal de 375m.

---

## 🛠️ Stack Tecnológico de Grado Aeroespacial

| Capa | Tecnologías |
| :--- | :--- |
| **Despliegue & Servidor** | [Vercel](https://vercel.com) con preset Nitro Serverless (`nodejs24.x` Fluid Compute) |
| **Arquitectura Web** | [TanStack Start](https://tanstack.com/start) (React 19, TypeScript 5.8, SSR Vite) |
| **Estilos & Layout** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons |
| **Cartografía y GPU** | Leaflet, Leaflet.VectorGrid, WebGL Shaders, Turf.js, Esri World Imagery |
| **Ingesta Satelital** | NASA FIRMS (MODIS/VIIRS), NASA POWER, NASA GIBS, NASA EONET |
| **Predicción Meteorológica** | Microsoft Weather API + Telemetría Agro-meteorológica NASA POWER |
| **Testing y Calidad** | Vitest (**65/65 tests unitarios al 100%**) y TypeScript (`tsc --noEmit` con 0 errores) |

---

## 🚀 Instalación y Puesta en Marcha Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/nipahantrax/centinela.git
cd centinela/centinelas

# 2. Instalar dependencias del proyecto
npm install

# 3. Configurar variables de entorno (.env)
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
│   │   ├── centinela-data.ts   # Polígonos de 11 municipios, botánica y recursos hídricos
│   │   ├── fire-indices.ts     # Física de ignición, regla 30-30-30, índice Ångström
│   │   ├── fire-operations.ts  # Doble ruteo de hidrantes y proyección de frentes
│   │   ├── harmonization.ts    # Algoritmo de fusión MODIS + VIIRS
│   │   ├── i18n.tsx            # Motor reactivo trilingüe (ES, QU, EN)
│   │   ├── nasa-data.ts        # Parsers FIRMS, POWER, EONET, GIBS
│   │   ├── nasa-queries.ts     # Consultas cacheadas TanStack Query
│   │   └── webgl-clustering.ts # Spatial Grid KD-Tree en GPU WebGL
│   ├── routes/
│   │   ├── __root.tsx          # Shell principal, i18n Provider y Toaster
│   │   ├── dashboard.tsx       # Centro de Mando Táctico Widescreen 1920px (Desktop)
│   │   ├── movil.tsx           # Vista móvil de respuesta rápida en terreno
│   │   ├── alerta.$id.tsx      # Ficha técnica individual de foco térmico
│   │   ├── reportes.tsx        # Auditoría analítica y exportación GeoJSON/CSV
│   │   ├── proyecto.tsx        # Documentación de arquitectura técnica municipal GAMC
│   │   └── publico.tsx         # Portal ciudadano de libre acceso
│   └── test/                   # 8 suites de pruebas unitarias (Vitest, 65 tests)
├── vite.config.ts              # Configuración Vite con preset Nitro para Vercel
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
