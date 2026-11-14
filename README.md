# 🛰️ Operación CENTINELA
### Plataforma Táctica de Alerta Temprana, Armonización Satelital y Coordinación de Incendios Forestales
**NASA Space Apps Challenge 2026 · Cochabamba, Bolivia**  
**Desafío Oficial:** *Harmonization of MODIS and VIIRS Hot Spots*

---

## 📖 Descripción del Proyecto

> *"Los datos satelitales por sí solos informan; cruzados con los recursos del municipio y el terreno, operan."*

**CENTINELA** es un Centro de Mando Táctico y Sistema de Alerta Temprana diseñado para monitorear, predecir el avance y coordinar la respuesta ante incendios forestales en Bolivia, con prioridad especial en el **Parque Nacional Tunari**, el **GAMC (Gobierno Autónomo Municipal de Cochabamba)** y los **9 departamentos del país**.

Integra y armoniza en tiempo real datos abiertos de constelaciones de satélites de la **NASA** (FIRMS, POWER, GIBS, EONET) cruzándolos con la infraestructura crítica sobre el terreno: hidrantes, tomas de agua, rutas de acceso para autobombas y directorios de emergencia departamentales (COE y Bomberos 119).

---

## 🎯 El Desafío NASA: Armonización MODIS + VIIRS

El reto oficial exige resolver la disparidad entre los sensores térmicos de la NASA:
* **MODIS (satélites Terra / Aqua):** Resolución espacial de ~1000m y más de 20 años de registro continuo.
* **VIIRS (Suomi-NPP / NOAA-20):** Resolución espacial de 375m (I-Band), permitiendo detectar focos incipientes y perfilar bordes con nitidez.

### 🧠 Nuestro Algoritmo de Armonización (`src/lib/harmonization.ts`)
1. **Detección Cruzada Espaciotemporal:** Analiza los focos con umbrales geodésicos $\le 1.5\text{ km}$ y temporales $\le 12\text{ horas}$.
2. **Reducción de Falsos Positivos:** La corroboración inter-satelital reduce el riesgo de falso positivo a $<1\%$ y eleva la confianza táctica a $>95\%$.
3. **Refinamiento Espacial:** Reubica el centroide en la coordenada de 375m de VIIRS.
4. **FRP Integrado:** Suma y promedia la Potencia Radiativa de Fuego en Megavatios (MW).

---

## ⚡ Características Principales

* 🎛️ **Centro de Mando Táctico (`/dashboard`):** 
  - Mosaico satelital HD de Esri con capas térmicas NASA GIBS y polígonos ADM1 de Bolivia.
  - **Badge de Armonización NASA** con filtros rápidos por corroboración dual, severidad térmica y proximidad a poblaciones.
  - **Inspector Táctico ICS-209:** Cálculo de agua requerida (~L), severidad FRP y botón de un clic para copiar la ficha de despacho para radio y WhatsApp.
* 🧭 **Vector Táctico de Viento y Peligro de Ångström:**
  - Rosa náutica interactiva con aguja dinámica indicando dirección y avance del frente de fuego a sotavento.
  - Cálculo automático del **Índice de Ångström** a partir de temperatura y humedad relativa de **NASA POWER**.
* 📱 **Vista Móvil de Respuesta Rápida (`/movil`):** Optimizada para brigadistas y personal de patrullaje con botón de auxilio SOS y geolocalización GPS de alta precisión.
* 👥 **Portal Ciudadano (`/publico`):** Consulta vecinal libre de barreras para verificar focos activos, recomendaciones y directorio de emergencia verificado.
* 📊 **Reportes y Auditoría Estratégica (`/reportes`):** Analítica con series de tiempo, focos por departamento y sellado criptográfico con hash **SHA-256**.
* 🔔 **Sirena Sonora Táctica:** Generación de frecuencias de alerta en tiempo real con Web Audio API (opt-in para evitar falsas alarmas).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Framework Fullstack** | [TanStack Start](https://tanstack.com/start) (Nitro + Vite SSR) |
| **Lenguaje** | TypeScript 5.8 & React 19 |
| **Enrutamiento y Estado** | TanStack Router & TanStack Query (React Query v5) |
| **Estilos & UI** | Tailwind CSS v4, Radix UI Primitives, Lucide Icons |
| **SIG y Mapeo** | Leaflet, Leaflet.VectorGrid, Esri World Imagery, Turf.js |
| **APIs NASA** | NASA FIRMS (MODIS/VIIRS), NASA POWER, NASA GIBS, NASA EONET |
| **Backend & Base de Datos** | TanStack Server Functions, Supabase (PostgreSQL + RLS + Realtime) |
| **Testing** | Vitest (24/24 tests unitarios pasando) |

---

## 🚀 Instalación y Uso Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/nipahantrax/centinela.git
cd centinela

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (opcional para FIRMS en vivo)
cp .env.example .env

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Ejecutar la suite de pruebas unitarias
npm test
```

Abre en tu navegador: [http://localhost:8080](http://localhost:8080)

---

## 👥 Equipo y Créditos
* **Participante:** Rodrigo Abel (Lextech Academy)
* **Evento:** NASA Space Apps Challenge Cochabamba 2026
* **Licencia:** MIT
