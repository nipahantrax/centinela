export type Status = "Activo" | "Monitoreo" | "Controlado";
export type Zone = string;

export interface BotanicalSpecies {
  id: string;
  scientificName: string;
  commonName: string;
  group: 1 | 2 | 3 | 4;
  groupName: string;
  riskMultiplier: number;
  fireBehavior: string;
  ecologicalFloor: string;
  municipalities: string[];
  isProtected?: boolean;
}

export interface BotanicalProfile {
  dominantSpecies: BotanicalSpecies[];
  fuelModel: "Combustible Ligero (Pastizal 90%)" | "Madera / Conífera (10%)" | "Arbustal Resinoso" | "Chaqueo / Barbecho";
  overallMultiplier: number;
  advisory: string;
}

export interface MunicipalCisternPoint {
  id: string;
  municipality: string;
  name: string;
  lat: number;
  lng: number;
  capacityLiters: number;
  status: "En Apresto Preventivo" | "Desplegada" | "Disponible";
  contact: string;
}

export interface HumanRiskPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitudeM: number;
  type: "Camping / Trekking" | "Cota Alta >3200m" | "Interfase Urbana / Chaqueo";
  riskNote: string;
}

export interface Incident {
  id: string;
  date: string; // ISO
  zone: Zone;
  lat: number;
  lng: number;
  confidence: number | null;
  frp: number | null; // MW
  areaHa: number | null;
  source: "MODIS" | "VIIRS" | "MODIS+VIIRS armonizado" | "EONET";
  live?: boolean;
  status: Status;
  altitude: number | null;
  hydrant: { name: string; distKm: number | null };
  route: { state: "Ruta Habilitada" | "Ruta Restringida" | "Solo a pie" | "No verificada"; distKm: number | null; etaMin: number | null };
  botany?: BotanicalProfile;
}

export interface Node {
  id: string;
  name: string;
  municipality: string;
  center: [number, number];
  zoom: number;
  weather: { temp: number; wind: number; windDir: string; windDeg: number; rh: number };
  botany: BotanicalProfile;
  cisternPoint: MunicipalCisternPoint;
}

// ==========================================
// CATASTRO BOTÁNICO DE COMBUSTIBILIDAD COCHABAMBA
// ==========================================
export const BOTANICAL_CATALOG: BotanicalSpecies[] = [
  // Grupo 1: Especies Introducidas Altamente Inflamables
  {
    id: "eucalipto",
    scientificName: "Eucalyptus globulus",
    commonName: "Eucalipto",
    group: 1,
    groupName: "Introducidas Altamente Inflamables",
    riskMultiplier: 1.6,
    fireBehavior: "Corteza en tiras voladoras que generan focos secundarios a gran distancia. Hojas con aceites volátiles explosivos.",
    ecologicalFloor: "Laderas y valles (2.500 - 3.400 msnm)",
    municipalities: ["Cercado", "Sacaba", "Tiquipaya", "Quillacollo", "Colcapirhua", "Vinto"],
  },
  {
    id: "pino",
    scientificName: "Pinus radiata",
    commonName: "Pino",
    group: 1,
    groupName: "Introducidas Altamente Inflamables",
    riskMultiplier: 1.5,
    fireBehavior: "Resina altamente inflamable y colchón grueso de pinocha seca en suelo que acelera el fuego hacia las copas (>1000°C - 1200°C).",
    ecologicalFloor: "Laderas medias y altas del Tunari (2.800 - 3.600 msnm)",
    municipalities: ["Cercado", "Tiquipaya", "Quillacollo", "Sacaba"],
  },
  {
    id: "retama",
    scientificName: "Spartium junceum",
    commonName: "Retama",
    group: 1,
    groupName: "Introducidas Altamente Inflamables",
    riskMultiplier: 1.3,
    fireBehavior: "Arbusto invasor en bordes de caminos y quebradas; vainas y ramas secas de ignición rápida.",
    ecologicalFloor: "Bordes de caminos y quebradas urbanas (2.500 - 3.000 msnm)",
    municipalities: ["Cercado", "Sacaba", "Quillacollo", "Tiquipaya", "Vinto", "Colcapirhua"],
  },

  // Grupo 2: Pastizales y Matorrales - Combustibles Ligeros (90% superficie quemada)
  {
    id: "ichu",
    scientificName: "Stipa ichu",
    commonName: "Paja brava / Ichu",
    group: 2,
    groupName: "Pastizales y Matorrales (90% Sup. Quemada)",
    riskMultiplier: 1.4,
    fireBehavior: "Deshidratación extrema de julio a noviembre. Propagación de llama a altísima velocidad impulsada por viento.",
    ecologicalFloor: "Puna y laderas altas (>3.200 msnm)",
    municipalities: ["Morochata", "Tapacarí", "Colomi", "Sipe Sipe", "Tiquipaya", "Quillacollo", "Sacaba"],
  },
  {
    id: "thola",
    scientificName: "Baccharis spp.",
    commonName: "Thola / T'ola",
    group: 2,
    groupName: "Pastizales y Matorrales (90% Sup. Quemada)",
    riskMultiplier: 1.35,
    fireBehavior: "Arbusto resinoso nativo; arde intensamente incluso estando verde o semiverde. Actúa como combustible de escalera.",
    ecologicalFloor: "Laderas secas y altiplano de transición (2.800 - 3.800 msnm)",
    municipalities: ["Sipe Sipe", "Tapacarí", "Morochata", "Quillacollo"],
  },
  {
    id: "chacatea",
    scientificName: "Dodonaea viscosa",
    commonName: "Chacatea",
    group: 2,
    groupName: "Pastizales y Matorrales (90% Sup. Quemada)",
    riskMultiplier: 1.35,
    fireBehavior: "Hojas resinosas viscosas de combustión violenta que elevan la altura de la llama.",
    ecologicalFloor: "Laderas rocosas y secas (2.500 - 3.200 msnm)",
    municipalities: ["Cercado", "Sacaba", "Sipe Sipe", "Vinto"],
  },
  {
    id: "chilca",
    scientificName: "Baccharis latifolia",
    commonName: "Chilca",
    group: 2,
    groupName: "Pastizales y Matorrales (90% Sup. Quemada)",
    riskMultiplier: 1.3,
    fireBehavior: "Matorral bajo que propaga el fuego desde el suelo hacia las copas de los árboles.",
    ecologicalFloor: "Quebradas y márgenes de ríos (2.500 - 3.100 msnm)",
    municipalities: ["Cercado", "Tiquipaya", "Sacaba", "Quillacollo", "Colcapirhua"],
  },

  // Grupo 3: Especies Nativas Vulnerables (Prioridad Máxima de Conservación)
  {
    id: "kewina",
    scientificName: "Polylepis spp.",
    commonName: "Kewiña / Queñua",
    group: 3,
    groupName: "Especies Nativas Vulnerables (Conservación Máxima)",
    riskMultiplier: 1.25,
    fireBehavior: "Corteza laminada tipo papel que prende con facilidad; bosque relicto de regeneración extremadamente lenta (décadas).",
    ecologicalFloor: "Cabeceras de cuenca y cotas altas (3.200 - 4.200 msnm)",
    municipalities: ["Tiquipaya", "Quillacollo", "Sacaba", "Colomi"],
    isProtected: true,
  },
  {
    id: "kiswara",
    scientificName: "Buddleja coriacea",
    commonName: "Kiswara",
    group: 3,
    groupName: "Especies Nativas Vulnerables (Conservación Máxima)",
    riskMultiplier: 1.15,
    fireBehavior: "Árbol nativo de cabecera; crítico para la retención hídrica y recarga de acuíferos de Cochabamba.",
    ecologicalFloor: "Quebradas altas húmedas (3.000 - 3.800 msnm)",
    municipalities: ["Tiquipaya", "Colomi", "Sacaba"],
    isProtected: true,
  },
  {
    id: "aliso",
    scientificName: "Alnus acuminata",
    commonName: "Aliso",
    group: 3,
    groupName: "Especies Nativas Vulnerables (Conservación Máxima)",
    riskMultiplier: 1.1,
    fireBehavior: "Protector de riberas; su pérdida ocasiona erosión torrencial en la época de lluvias.",
    ecologicalFloor: "Quebradas y orillas de arroyos (2.400 - 3.200 msnm)",
    municipalities: ["Tiquipaya", "Sacaba", "Colomi"],
    isProtected: true,
  },
  {
    id: "molle",
    scientificName: "Schinus molle",
    commonName: "Molle",
    group: 3,
    groupName: "Especies Nativas Vulnerables (Conservación Máxima)",
    riskMultiplier: 1.2,
    fireBehavior: "Árbol emblemático de valle bajo; afectado por quemas agrícolas y loteamientos.",
    ecologicalFloor: "Valle central y bajo (2.400 - 2.800 msnm)",
    municipalities: ["Cercado", "Vinto", "Sipe Sipe", "Colcapirhua"],
    isProtected: true,
  },
  {
    id: "algarrobo",
    scientificName: "Prosopis spp.",
    commonName: "Algarrobo",
    group: 3,
    groupName: "Especies Nativas Vulnerables (Conservación Máxima)",
    riskMultiplier: 1.2,
    fireBehavior: "Vegetación xerofítica en zonas semiáridas, combustible pesado de combustión lenta.",
    ecologicalFloor: "Valle seco occidental (2.300 - 2.700 msnm)",
    municipalities: ["Sipe Sipe", "Vinto"],
    isProtected: true,
  },

  // Grupo 4: Vegetación de Transición al Trópico
  {
    id: "chume",
    scientificName: "Rastrojo / Barbecho tropical",
    commonName: "Chume seco de chaqueo",
    group: 4,
    groupName: "Transición al Trópico / Chaqueo",
    riskMultiplier: 1.45,
    fireBehavior: "Restos vegetales secos tras desmonte; arden con altas temperaturas en rachas de sequía.",
    ecologicalFloor: "Vertiente norte hacia el Chapare (800 - 2.200 msnm)",
    municipalities: ["Villa Tunari", "Colomi"],
  },
  {
    id: "tacuara",
    scientificName: "Guadua chacoensis",
    commonName: "Tacuara / Bambú nativo",
    group: 4,
    groupName: "Transición al Trópico / Chaqueo",
    riskMultiplier: 1.4,
    fireBehavior: "Tallos huecos que estallan al calentarse y proyectan fragmentos encendidos.",
    ecologicalFloor: "Bosque húmedo de montaña y laderas orientales (1.000 - 2.400 msnm)",
    municipalities: ["Villa Tunari"],
  },
];

export function getBotanicalProfile(municipalityName: string): BotanicalProfile {
  const species = BOTANICAL_CATALOG.filter((s) =>
    s.municipalities.some((m) => m.toLowerCase() === municipalityName.toLowerCase())
  );
  const maxMul = species.length > 0 ? Math.max(...species.map((s) => s.riskMultiplier)) : 1.2;

  let fuelModel: BotanicalProfile["fuelModel"] = "Combustible Ligero (Pastizal 90%)";
  if (species.some((s) => s.group === 4)) {
    fuelModel = "Chaqueo / Barbecho";
  } else if (species.some((s) => s.id === "pino" || s.id === "eucalipto")) {
    fuelModel = "Madera / Conífera (10%)";
  } else if (species.some((s) => s.group === 2)) {
    fuelModel = "Combustible Ligero (Pastizal 90%)";
  }

  const hasProtected = species.some((s) => s.isProtected);
  const advisory = hasProtected
    ? `Atención prioritaria: Presencia de especies vulnerables (${species.filter(s => s.isProtected).map(s => s.commonName).join(", ")}). Evitar ingreso de maquinaria pesada en relictos.`
    : `Estrato vegetal predominante: ${species.slice(0, 2).map((s) => s.commonName).join(", ")}. Propagación rápida en pastizal.`;

  return {
    dominantSpecies: species,
    fuelModel,
    overallMultiplier: maxMul,
    advisory,
  };
}

// ==========================================
// LOS 11 MUNICIPIOS DEL EJE Y PARQUE TUNARI
// ==========================================
export const NODES: Node[] = [
  {
    id: "cercado",
    name: "1. Cercado (Cochabamba)",
    municipality: "Cercado",
    center: [-17.3895, -66.1568],
    zoom: 13,
    weather: { temp: 31, wind: 34, windDir: "NE", windDeg: 45, rh: 18 },
    botany: getBotanicalProfile("Cercado"),
    cisternPoint: {
      id: "cis-cercado",
      municipality: "Cercado",
      name: "Parque Excombatientes / SEMAPA Central",
      lat: -17.382,
      lng: -66.168,
      capacityLiters: 20000,
      status: "En Apresto Preventivo",
      contact: "Bomberos 119 GAMC / UGR",
    },
  },
  {
    id: "sacaba",
    name: "2. Sacaba",
    municipality: "Sacaba",
    center: [-17.404, -66.04],
    zoom: 12,
    weather: { temp: 30, wind: 32, windDir: "E", windDeg: 80, rh: 19 },
    botany: getBotanicalProfile("Sacaba"),
    cisternPoint: {
      id: "cis-sacaba",
      municipality: "Sacaba",
      name: "Base Operativa Huayllani / Curva de Sacaba",
      lat: -17.398,
      lng: -66.075,
      capacityLiters: 15000,
      status: "En Apresto Preventivo",
      contact: "UGR Sacaba / Bomberos",
    },
  },
  {
    id: "quillacollo",
    name: "3. Quillacollo",
    municipality: "Quillacollo",
    center: [-17.395, -66.278],
    zoom: 12,
    weather: { temp: 32, wind: 36, windDir: "NNE", windDeg: 30, rh: 16 },
    botany: getBotanicalProfile("Quillacollo"),
    cisternPoint: {
      id: "cis-quillacollo",
      municipality: "Quillacollo",
      name: "Planta Potabilizadora / Av. Blanco Galindo km 11",
      lat: -17.39,
      lng: -66.265,
      capacityLiters: 18000,
      status: "En Apresto Preventivo",
      contact: "GEOS / Bomberos Quillacollo",
    },
  },
  {
    id: "tiquipaya",
    name: "4. Tiquipaya",
    municipality: "Tiquipaya",
    center: [-17.338, -66.216],
    zoom: 13,
    weather: { temp: 31, wind: 38, windDir: "N", windDeg: 10, rh: 15 },
    botany: getBotanicalProfile("Tiquipaya"),
    cisternPoint: {
      id: "cis-tiquipaya",
      municipality: "Tiquipaya",
      name: "Campamento SERNAP / Cuenca Taquiña",
      lat: -17.322,
      lng: -66.212,
      capacityLiters: 15000,
      status: "En Apresto Preventivo",
      contact: "Guardaparques Tunari / SAR-Bolivia",
    },
  },
  {
    id: "colcapirhua",
    name: "5. Colcapirhua",
    municipality: "Colcapirhua",
    center: [-17.398, -66.236],
    zoom: 13,
    weather: { temp: 31, wind: 28, windDir: "NE", windDeg: 45, rh: 20 },
    botany: getBotanicalProfile("Colcapirhua"),
    cisternPoint: {
      id: "cis-colcapirhua",
      municipality: "Colcapirhua",
      name: "Tanque Municipal km 8 Blanco Galindo",
      lat: -17.395,
      lng: -66.23,
      capacityLiters: 10000,
      status: "Disponible",
      contact: "UGR Colcapirhua",
    },
  },
  {
    id: "vinto",
    name: "6. Vinto",
    municipality: "Vinto",
    center: [-17.412, -66.315],
    zoom: 12,
    weather: { temp: 32, wind: 31, windDir: "ENE", windDeg: 60, rh: 17 },
    botany: getBotanicalProfile("Vinto"),
    cisternPoint: {
      id: "cis-vinto",
      municipality: "Vinto",
      name: "Toma de Riego Vinto Chico / Carretera Oruro",
      lat: -17.418,
      lng: -66.32,
      capacityLiters: 12000,
      status: "Disponible",
      contact: "Seguridad Ciudadana Vinto",
    },
  },
  {
    id: "sipesipe",
    name: "7. Sipe Sipe",
    municipality: "Sipe Sipe",
    center: [-17.452, -66.365],
    zoom: 12,
    weather: { temp: 33, wind: 35, windDir: "E", windDeg: 90, rh: 14 },
    botany: getBotanicalProfile("Sipe Sipe"),
    cisternPoint: {
      id: "cis-sipesipe",
      municipality: "Sipe Sipe",
      name: "Subestación Sipe Sipe / Entrada a Viloma",
      lat: -17.445,
      lng: -66.355,
      capacityLiters: 12000,
      status: "En Apresto Preventivo",
      contact: "UGR Sipe Sipe",
    },
  },
  {
    id: "colomi",
    name: "8. Colomi",
    municipality: "Colomi",
    center: [-17.348, -65.865],
    zoom: 11,
    weather: { temp: 24, wind: 33, windDir: "SE", windDeg: 135, rh: 28 },
    botany: getBotanicalProfile("Colomi"),
    cisternPoint: {
      id: "cis-colomi",
      municipality: "Colomi",
      name: "Represa Corani / Retén Vial Colomi",
      lat: -17.29,
      lng: -65.88,
      capacityLiters: 15000,
      status: "Disponible",
      contact: "COE Colomi / Policía Rural",
    },
  },
  {
    id: "villatunari",
    name: "9. Villa Tunari",
    municipality: "Villa Tunari",
    center: [-16.974, -65.42],
    zoom: 11,
    weather: { temp: 34, wind: 24, windDir: "N", windDeg: 0, rh: 48 },
    botany: getBotanicalProfile("Villa Tunari"),
    cisternPoint: {
      id: "cis-villatunari",
      municipality: "Villa Tunari",
      name: "Base de Protección Parque Carrasco / Chipiriri",
      lat: -16.95,
      lng: -65.43,
      capacityLiters: 20000,
      status: "Disponible",
      contact: "SERNAP Carrasco / Bomberos Chapare",
    },
  },
  {
    id: "tapacari",
    name: "10. Tapacarí",
    municipality: "Tapacarí",
    center: [-17.525, -66.61],
    zoom: 11,
    weather: { temp: 29, wind: 37, windDir: "WNW", windDeg: 290, rh: 15 },
    botany: getBotanicalProfile("Tapacarí"),
    cisternPoint: {
      id: "cis-tapacari",
      municipality: "Tapacarí",
      name: "Río Tapacarí / Cruce Leque",
      lat: -17.51,
      lng: -66.58,
      capacityLiters: 10000,
      status: "En Apresto Preventivo",
      contact: "Subgobernación Tapacarí",
    },
  },
  {
    id: "morochata",
    name: "11. Morochata",
    municipality: "Morochata",
    center: [-17.275, -66.49],
    zoom: 11,
    weather: { temp: 26, wind: 36, windDir: "NW", windDeg: 315, rh: 16 },
    botany: getBotanicalProfile("Morochata"),
    cisternPoint: {
      id: "cis-morochata",
      municipality: "Morochata",
      name: "Yayani / Vivero Comunal Morochata",
      lat: -17.26,
      lng: -66.47,
      capacityLiters: 10000,
      status: "En Apresto Preventivo",
      contact: "Central Campesina Morochata",
    },
  },
];

// Puntos de riesgo antrópico (Fogatas, camping y cotas altas >3200m donde surgen incendios)
export const HUMAN_RISK_POINTS: HumanRiskPoint[] = [
  {
    id: "hr-pico-tunari",
    name: "Sendero Cumbre Pico Tunari (>4.500 msnm)",
    lat: -17.29,
    lng: -66.38,
    altitudeM: 5035,
    type: "Cota Alta >3200m",
    riskNote: "Campamentos de montañistas y fogatas en pajonales de ichu. De aquí el fuego desciende a sotavento.",
  },
  {
    id: "hr-wara-wara",
    name: "Laguna Wara Wara / Camping recreativo",
    lat: -17.287,
    lng: -66.215,
    altitudeM: 3780,
    type: "Camping / Trekking",
    riskNote: "Zona de alta concurrencia de fin de semana; fogatas no apagadas y colillas en hojarasca.",
  },
  {
    id: "hr-cota-cota",
    name: "Cerro Cota / Interfase agrícola",
    lat: -17.355,
    lng: -66.09,
    altitudeM: 2950,
    type: "Interfase Urbana / Chaqueo",
    riskNote: "Quemas de rastrojo y desmonte que saltan hacia la serranía por ráfagas de viento.",
  },
  {
    id: "hr-taquina",
    name: "Quebrada Taquiña Norte",
    lat: -17.315,
    lng: -66.175,
    altitudeM: 3200,
    type: "Cota Alta >3200m",
    riskNote: "Sendero de arrieros y rebaños; pastoreo con quema de rejuvenecimiento de pastos.",
  },
];

export interface PreventiveZone {
  id: string;
  name: string;
  municipality: string;
  polygon: [number, number][];
  tempC: number;
  windKmh: number;
  rhPct: number;
  fuelType: string;
  riskReason: string;
}

export const PREVENTIVE_30_ZONES: PreventiveZone[] = [
  {
    id: "prev-taquina",
    name: "Laderas Secas Taquiña Norte - Tiquipaya",
    municipality: "Tiquipaya",
    polygon: [
      [-17.315, -66.21],
      [-17.305, -66.195],
      [-17.325, -66.185],
      [-17.335, -66.215],
    ],
    tempC: 32,
    windKmh: 36,
    rhPct: 15,
    fuelType: "Pinus radiata & Hojarasca seca",
    riskReason: "Regla 30-30-30 activa. Desecación extrema por vientos de ladera.",
  },
  {
    id: "prev-huayllani",
    name: "Serranía Huayllani / San Pedro - Sacaba",
    municipality: "Sacaba",
    polygon: [
      [-17.38, -66.07],
      [-17.365, -66.05],
      [-17.385, -66.035],
      [-17.398, -66.065],
    ],
    tempC: 31,
    windKmh: 34,
    rhPct: 17,
    fuelType: "Eucalyptus globulus & Pajonal",
    riskReason: "Interfase urbana-forestal con acumulación de corteza altamente combustible.",
  },
  {
    id: "prev-cota",
    name: "Cerro Cota / Laderas Vinto - Quillacollo",
    municipality: "Quillacollo",
    polygon: [
      [-17.37, -66.295],
      [-17.355, -66.275],
      [-17.375, -66.255],
      [-17.388, -66.285],
    ],
    tempC: 33,
    windKmh: 38,
    rhPct: 14,
    fuelType: "Stipa ichu (Pajonal) & Retama",
    riskReason: "Ráfagas secas del oeste aceleran desecación de pastizal fino.",
  },
  {
    id: "prev-andrada",
    name: "Cuenca Andrada / Lindero Parque Tunari - Cercado",
    municipality: "Cercado",
    polygon: [
      [-17.345, -66.155],
      [-17.332, -66.135],
      [-17.352, -66.128],
      [-17.365, -66.148],
    ],
    tempC: 31,
    windKmh: 32,
    rhPct: 18,
    fuelType: "Bosque mixto & Quebrada xerofítica",
    riskReason: "Punto de acceso de excursionistas y loteamientos sin control.",
  },
];

// ==========================================
// MÓDULO 1: BASE DE DATOS GEOESPACIAL DE RECURSOS HÍDRICOS DE COCHABAMBA
// ==========================================
export interface WaterResource {
  id: string;
  name: string;
  type: "rio" | "laguna" | "tanque";
  categoryLabel: "Río / Riachuelo (Motobomba)" | "Laguna / Embalse (Helicóptero/Bambi)" | "Tanque / Hidrante Municipal";
  lat: number;
  lng: number;
  municipality: string;
  altitudeM: number;
  capacityOrFlow: string;
  flowStatus: "Caudal Permanente Activo" | "Caudal Estacional" | "Red Presurizada Activa";
}

export const WATER_RESOURCES: WaterResource[] = [
  // 1. Ríos y Riachuelos (Captación con Motobomba y Cuadrillas)
  {
    id: "rio-taquina",
    name: "Río y Quebrada Taquiña",
    type: "rio",
    categoryLabel: "Río / Riachuelo (Motobomba)",
    lat: -17.315,
    lng: -66.195,
    municipality: "Tiquipaya",
    altitudeM: 2850,
    capacityOrFlow: "45 L/s caudal medio",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "rio-khora",
    name: "Río Khora y Río Chijllawiri",
    type: "rio",
    categoryLabel: "Río / Riachuelo (Motobomba)",
    lat: -17.338,
    lng: -66.242,
    municipality: "Tiquipaya / Quillacollo",
    altitudeM: 2710,
    capacityOrFlow: "30 L/s en estiaje",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "rio-chocaya",
    name: "Río Chocaya y Río Pajcha",
    type: "rio",
    categoryLabel: "Río / Riachuelo (Motobomba)",
    lat: -17.342,
    lng: -66.285,
    municipality: "Quillacollo / El Paso",
    altitudeM: 2680,
    capacityOrFlow: "25 L/s",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "rio-viloma",
    name: "Río Viloma y Río Tapacarí",
    type: "rio",
    categoryLabel: "Río / Riachuelo (Motobomba)",
    lat: -17.43,
    lng: -66.365,
    municipality: "Vinto / Sipe Sipe",
    altitudeM: 2540,
    capacityOrFlow: "35 L/s",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "rio-huayllani",
    name: "Río Huayllani y Quebrada Chaupisuyu",
    type: "rio",
    categoryLabel: "Río / Riachuelo (Motobomba)",
    lat: -17.382,
    lng: -66.052,
    municipality: "Sacaba",
    altitudeM: 2760,
    capacityOrFlow: "20 L/s",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "rio-rocha",
    name: "Río Rocha (Eje Metropolitano)",
    type: "rio",
    categoryLabel: "Río / Riachuelo (Motobomba)",
    lat: -17.395,
    lng: -66.16,
    municipality: "Cercado",
    altitudeM: 2570,
    capacityOrFlow: "120 L/s",
    flowStatus: "Caudal Permanente Activo",
  },

  // 2. Lagunas y Embalses (Recarga Bambi Bucket Helicóptero + Cisternas)
  {
    id: "laguna-warawara",
    name: "Laguna Wara Wara",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.287,
    lng: -66.215,
    municipality: "Cercado / Cordillera Tunari",
    altitudeM: 3950,
    capacityOrFlow: "1.200.000 m³ embalse",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "laguna-sanpablo",
    name: "Laguna San Pablo y Laguna Macho",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.255,
    lng: -66.275,
    municipality: "Tiquipaya / Cordillera",
    altitudeM: 4120,
    capacityOrFlow: "850.000 m³",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "laguna-alalay",
    name: "Laguna Alalay",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.415,
    lng: -66.135,
    municipality: "Cercado",
    altitudeM: 2560,
    capacityOrFlow: "Espejo urbano de agua accesible",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "laguna-conacona",
    name: "Laguna Coña Coña",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.39,
    lng: -66.192,
    municipality: "Cercado",
    altitudeM: 2580,
    capacityOrFlow: "Reservorio oeste cercado",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "represa-corani",
    name: "Represa Corani",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.29,
    lng: -65.88,
    municipality: "Colomi",
    altitudeM: 3240,
    capacityOrFlow: "30.000.000 m³ gran embalse",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "represa-angostura",
    name: "Laguna La Angostura",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.53,
    lng: -65.92,
    municipality: "Arbieto / Tolata",
    altitudeM: 2700,
    capacityOrFlow: "75.000.000 m³ capacidad",
    flowStatus: "Caudal Permanente Activo",
  },
  {
    id: "represa-escalerani",
    name: "Represa Escalerani",
    type: "laguna",
    categoryLabel: "Laguna / Embalse (Helicóptero/Bambi)",
    lat: -17.26,
    lng: -66.18,
    municipality: "Tiquipaya / Cordillera",
    altitudeM: 4050,
    capacityOrFlow: "6.500.000 m³",
    flowStatus: "Caudal Permanente Activo",
  },

  // 3. Tanques Municipales e Hidrantes (SEMAPA / EMAPAS / GAMC)
  {
    id: "tanque-taquina",
    name: "Tanque Taquiña SEMAPA / Tiquipaya",
    type: "tanque",
    categoryLabel: "Tanque / Hidrante Municipal",
    lat: -17.335,
    lng: -66.215,
    municipality: "Tiquipaya",
    altitudeM: 2780,
    capacityOrFlow: "250.000 L reserva presurizada",
    flowStatus: "Red Presurizada Activa",
  },
  {
    id: "tanque-calacala",
    name: "Planta SEMAPA Cala Cala",
    type: "tanque",
    categoryLabel: "Tanque / Hidrante Municipal",
    lat: -17.375,
    lng: -66.162,
    municipality: "Cercado",
    altitudeM: 2590,
    capacityOrFlow: "Tanque matriz 500.000 L",
    flowStatus: "Red Presurizada Activa",
  },
  {
    id: "tanque-sanpedro",
    name: "Tanque Cerro San Pedro",
    type: "tanque",
    categoryLabel: "Tanque / Hidrante Municipal",
    lat: -17.392,
    lng: -66.14,
    municipality: "Cercado",
    altitudeM: 2680,
    capacityOrFlow: "180.000 L",
    flowStatus: "Red Presurizada Activa",
  },
  {
    id: "tanque-huayllani",
    name: "Red Huayllani EMAPAS Sacaba",
    type: "tanque",
    categoryLabel: "Tanque / Hidrante Municipal",
    lat: -17.388,
    lng: -66.072,
    municipality: "Sacaba",
    altitudeM: 2740,
    capacityOrFlow: "200.000 L",
    flowStatus: "Red Presurizada Activa",
  },
  {
    id: "hidrante-quillacollo",
    name: "Hidrante Quillacollo Norte H-140",
    type: "tanque",
    categoryLabel: "Tanque / Hidrante Municipal",
    lat: -17.39,
    lng: -66.275,
    municipality: "Quillacollo",
    altitudeM: 2610,
    capacityOrFlow: "Conexión directa 4 pulgadas",
    flowStatus: "Red Presurizada Activa",
  },
  {
    id: "toma-chocaya",
    name: "Toma Chocaya Vinto",
    type: "tanque",
    categoryLabel: "Tanque / Hidrante Municipal",
    lat: -17.382,
    lng: -66.318,
    municipality: "Vinto",
    altitudeM: 2640,
    capacityOrFlow: "Toma de compuerta 60 L/s",
    flowStatus: "Red Presurizada Activa",
  },
];

/** Encuentra el recurso hídrico más cercano a unas coordenadas dadas */
export function findNearestWaterResource(lat: number, lng: number): { resource: WaterResource; distKm: number } {
  let nearest = WATER_RESOURCES[0]!;
  let minDist = Infinity;
  for (const r of WATER_RESOURCES) {
    const d = Math.hypot(r.lat - lat, r.lng - lng) * 111;
    if (d < minDist) {
      minDist = d;
      nearest = r;
    }
  }
  return { resource: nearest, distKm: Number(minDist.toFixed(1)) };
}

// ==========================================
// MÓDULO 2: DETECCIÓN DE ZONAS DE RECURRENCIA CRÍTICA Y CISTERNAS PREVENTIVAS
// ==========================================
export interface RecurrenceCluster {
  id: string;
  name: string;
  municipality: string;
  center: [number, number];
  radiusMeters: number;
  polygon: [number, number][];
  hotspotsCount: number;
  averageFRP: number;
  reason: string;
  suggestedCistern: {
    lat: number;
    lng: number;
    name: string;
    capacityLiters: number;
    roadAccess: string;
    impactAdvice: string;
  };
}

export const RECURRENCE_CLUSTERS: RecurrenceCluster[] = [
  {
    id: "cluster-taquina",
    name: "Clúster Taquiña Norte - Parque Tunari",
    municipality: "Tiquipaya",
    center: [-17.32, -66.205],
    radiusMeters: 2500,
    polygon: [
      [-17.305, -66.218],
      [-17.302, -66.195],
      [-17.322, -66.182],
      [-17.338, -66.198],
      [-17.335, -66.222],
    ],
    hotspotsCount: 8,
    averageFRP: 42.6,
    reason: "Zona con >3 focos consecutivos por temporada. Interfase urbana con pendiente pronunciada.",
    suggestedCistern: {
      lat: -17.325,
      lng: -66.2,
      name: "Taquiña Cruce Cota 2.850m",
      capacityLiters: 15000,
      roadAccess: "Vía empedrada y asfalto transitable para cisterna pesada",
      impactAdvice:
        "Alta concentración consecutiva de focos detectada en este sector. Se recomienda estacionar 1 Cisterna Municipal de 15.000 L o instalar tanque flexible (Bladder) en esta coordenada para reducir el tiempo de primer ataque de 35 min a 6 min.",
    },
  },
  {
    id: "cluster-huayllani",
    name: "Clúster Serranía Huayllani / Cerro San Pedro",
    municipality: "Sacaba",
    center: [-17.385, -66.055],
    radiusMeters: 2300,
    polygon: [
      [-17.37, -66.068],
      [-17.368, -66.042],
      [-17.392, -66.035],
      [-17.402, -66.058],
      [-17.395, -66.075],
    ],
    hotspotsCount: 6,
    averageFRP: 36.8,
    reason: "Quemas agrícolas y chaqueos recurrentes que se expanden hacia bosques de eucalipto.",
    suggestedCistern: {
      lat: -17.39,
      lng: -66.065,
      name: "Entrada Parque San Pedro / Huayllani Norte",
      capacityLiters: 15000,
      roadAccess: "Avenida pavimentada con conexión rápida a Sacaba central",
      impactAdvice:
        "Alta concentración consecutiva de focos detectada en este sector. Se recomienda estacionar 1 Cisterna Municipal de 15.000 L o instalar tanque flexible (Bladder) en esta coordenada para reducir el tiempo de primer ataque de 32 min a 5 min.",
    },
  },
  {
    id: "cluster-cota",
    name: "Clúster Cerro Cota / Laderas Vinto Norte",
    municipality: "Quillacollo / Vinto",
    center: [-17.375, -66.29],
    radiusMeters: 2200,
    polygon: [
      [-17.36, -66.302],
      [-17.355, -66.278],
      [-17.382, -66.265],
      [-17.395, -66.288],
      [-17.388, -66.31],
    ],
    hotspotsCount: 5,
    averageFRP: 29.4,
    reason: "Corredor de vientos catabáticos del Tunari con pastizal seco altamente inflamable.",
    suggestedCistern: {
      lat: -17.38,
      lng: -66.28,
      name: "Desvío Chocaya / Vinto Norte",
      capacityLiters: 15000,
      roadAccess: "Vía de ripio compactado de fácil maniobra de camión cisterna",
      impactAdvice:
        "Alta concentración consecutiva de focos detectada en este sector. Se recomienda estacionar 1 Cisterna Municipal de 15.000 L o instalar tanque flexible (Bladder) en esta coordenada para reducir el tiempo de primer ataque de 30 min a 7 min.",
    },
  },
];

// ==========================================
// MÓDULO 3: ZONAS DE VEGETACIÓN E INFLAMABILIDAD (TRIÁNGULO DEL FUEGO)
// ==========================================
export interface VegetationZone {
  id: string;
  name: string;
  municipality: string;
  fuelClassification:
    | "Combustible Extremo (1.35x)"
    | "Combustible Muy Alto (1.25x)"
    | "Combustible Medio-Alto (1.15x)"
    | "Prioridad Conservación SERNAP";
  multiplier: number;
  dominantSpecies: string;
  polygon: [number, number][];
  elevationRange: string;
  fireBehavior: string;
  isProtected?: boolean;
}

export const VEGETATION_ZONES: VegetationZone[] = [
  {
    id: "veg-eucalipto-pino-tunari",
    name: "Cinturón de Eucaliptos y Pinos Tunari Sur",
    municipality: "Cercado / Tiquipaya / Sacaba",
    fuelClassification: "Combustible Extremo (1.35x)",
    multiplier: 1.35,
    dominantSpecies: "Eucalyptus globulus & Pinus radiata",
    polygon: [
      [-17.345, -66.23],
      [-17.33, -66.18],
      [-17.35, -66.12],
      [-17.375, -66.15],
      [-17.37, -66.22],
    ],
    elevationRange: "2.600 - 3.400 msnm",
    fireBehavior:
      "Corteza desprendible en tiras ardientes transportadas por viento generando focos secundarios a 400m+. Fuego de copas violento (>1.100 °C).",
  },
  {
    id: "veg-ichu-altotunari",
    name: "Pajonales de Altura (Stipa ichu) Puna Tunari",
    municipality: "Morochata / Colomi / Tiquipaya Alto",
    fuelClassification: "Combustible Muy Alto (1.25x)",
    multiplier: 1.25,
    dominantSpecies: "Stipa ichu (Paja brava) & Tholares",
    polygon: [
      [-17.25, -66.35],
      [-17.22, -66.25],
      [-17.24, -66.15],
      [-17.28, -66.22],
      [-17.29, -66.32],
    ],
    elevationRange: ">3.400 - 4.200 msnm",
    fireBehavior:
      "Desecación extrema en estiaje. Propagación de llama a ras de suelo a altísima velocidad (>25 km/h frente de avance).",
  },
  {
    id: "veg-matorral-vallebajo",
    name: "Matorrales Xeromórficos y Espinales",
    municipality: "Sipe Sipe / Vinto / Quillacollo",
    fuelClassification: "Combustible Medio-Alto (1.15x)",
    multiplier: 1.15,
    dominantSpecies: "Retama, Molle (Schinus molle), Chacatea y Algarrobo",
    polygon: [
      [-17.41, -66.38],
      [-17.38, -66.33],
      [-17.41, -66.29],
      [-17.45, -66.35],
    ],
    elevationRange: "2.400 - 2.800 msnm",
    fireBehavior:
      "Matorrales resinosos inflamables que actúan como combustible de escalera hacia árboles y viviendas en interfase.",
  },
  {
    id: "veg-kewina-sernap",
    name: "Bosques Relictos de Kewiña (Polylepis) y Kiswara",
    municipality: "Tiquipaya / Sacaba / Colomi (Cuencas Altas)",
    fuelClassification: "Prioridad Conservación SERNAP",
    multiplier: 1.25,
    dominantSpecies: "Polylepis besseri (Kewiña) & Buddleja coriacea (Kiswara)",
    polygon: [
      [-17.27, -66.23],
      [-17.25, -66.2],
      [-17.27, -66.17],
      [-17.29, -66.2],
    ],
    elevationRange: "3.200 - 4.200 msnm",
    fireBehavior:
      "Especie nativa protegida de regeneración muy lenta (décadas). Corteza papirácea combustible. Pérdida crítica para recarga de acuíferos.",
    isProtected: true,
  },
];


/** Ignition risk 0-100 from temperature, wind and relative humidity. */
export function ignitionRisk(temp: number, wind: number, rh: number) {
  const t = Math.min(Math.max((temp - 6) / 30, 0), 1);
  const w = Math.min(wind / 45, 1);
  const h = 1 - Math.min(rh / 70, 1);
  return Math.round((t * 0.35 + w * 0.3 + h * 0.35) * 100);
}

export function riskLabel(r: number) {
  if (r >= 80) return { label: "Muy Alto", tone: "destructive" as const };
  if (r >= 60) return { label: "Alto", tone: "fire" as const };
  if (r >= 40) return { label: "Moderado", tone: "warning" as const };
  return { label: "Bajo", tone: "success" as const };
}

const now = new Date("2026-10-21T03:00:00Z").getTime();
const h = (hrs: number) => new Date(now - hrs * 3600_000).toISOString();

export const INCIDENTS: Incident[] = [
  {
    id: "INC-2026-0712",
    date: h(0.4),
    zone: "Tiquipaya · Parque N. Tunari",
    lat: -17.2954,
    lng: -66.2381,
    confidence: 96,
    frp: 58.2,
    areaHa: 42.5,
    source: "MODIS+VIIRS armonizado",
    status: "Activo",
    altitude: 3412,
    hydrant: { name: "Represa Wara Wara", distKm: 3.2 },
    route: { state: "Ruta Habilitada", distKm: 15.5, etaMin: 28 },
    botany: getBotanicalProfile("Tiquipaya"),
  },
  {
    id: "INC-2026-0711",
    date: h(1.2),
    zone: "Tiquipaya · Límite Cuenca Taquiña",
    lat: -17.3102,
    lng: -66.1745,
    confidence: 88,
    frp: 34.6,
    areaHa: 19.2,
    source: "VIIRS",
    status: "Activo",
    altitude: 3025,
    hydrant: { name: "Hidrante GAMC H-114 Tiquipaya", distKm: 2.1 },
    route: { state: "Ruta Restringida", distKm: 11.8, etaMin: 34 },
    botany: getBotanicalProfile("Tiquipaya"),
  },
  {
    id: "INC-2026-0710",
    date: h(2.6),
    zone: "Cercado · Cerro San Pedro",
    lat: -17.3858,
    lng: -66.1318,
    confidence: 76,
    frp: 14.4,
    areaHa: 4.8,
    source: "VIIRS",
    status: "Monitoreo",
    altitude: 2790,
    hydrant: { name: "Hidrante GAMC H-031 Av. Costanera", distKm: 0.9 },
    route: { state: "Ruta Habilitada", distKm: 3.4, etaMin: 9 },
    botany: getBotanicalProfile("Cercado"),
  },
  {
    id: "INC-2026-0709",
    date: h(4.1),
    zone: "Sacaba · Cerro Cota",
    lat: -17.3561,
    lng: -66.0874,
    confidence: 94,
    frp: 38.9,
    areaHa: 14.7,
    source: "MODIS+VIIRS armonizado",
    status: "Activo",
    altitude: 2950,
    hydrant: { name: "Tanque SEMAPA Cota", distKm: 1.6 },
    route: { state: "Solo a pie", distKm: 7.2, etaMin: 41 },
    botany: getBotanicalProfile("Sacaba"),
  },
  {
    id: "INC-2026-0708",
    date: h(9),
    zone: "Morochata · Cabecera Tunari",
    lat: -17.2731,
    lng: -66.3012,
    confidence: 68,
    frp: 11.1,
    areaHa: 7.3,
    source: "MODIS",
    status: "Monitoreo",
    altitude: 3680,
    hydrant: { name: "Laguna Macro", distKm: 4.4 },
    route: { state: "Solo a pie", distKm: 21.0, etaMin: 62 },
    botany: getBotanicalProfile("Morochata"),
  },
  {
    id: "INC-2026-0707",
    date: h(20),
    zone: "Sipe Sipe · Ladera Viloma",
    lat: -17.4412,
    lng: -66.3603,
    confidence: 82,
    frp: 18.7,
    areaHa: 13.0,
    source: "VIIRS",
    status: "Controlado",
    altitude: 2830,
    hydrant: { name: "Represa La Angostura", distKm: 14.8 },
    route: { state: "Ruta Habilitada", distKm: 12.4, etaMin: 22 },
    botany: getBotanicalProfile("Sipe Sipe"),
  },
  {
    id: "INC-2026-0706",
    date: h(34),
    zone: "Quillacollo · Bosque Liriuni",
    lat: -17.3217,
    lng: -66.2604,
    confidence: 93,
    frp: 31.3,
    areaHa: 24.4,
    source: "MODIS+VIIRS armonizado",
    status: "Controlado",
    altitude: 3190,
    hydrant: { name: "Hidrante GAMC H-140 Quillacollo", distKm: 2.7 },
    route: { state: "Ruta Habilitada", distKm: 18.1, etaMin: 31 },
    botany: getBotanicalProfile("Quillacollo"),
  },
  {
    id: "INC-2026-0705",
    date: h(52),
    zone: "Colomi · Corani Norte",
    lat: -17.3012,
    lng: -65.8991,
    confidence: 72,
    frp: 8.4,
    areaHa: 3.2,
    source: "VIIRS",
    status: "Controlado",
    altitude: 3110,
    hydrant: { name: "Represa Corani", distKm: 1.6 },
    route: { state: "Ruta Habilitada", distKm: 8.0, etaMin: 14 },
    botany: getBotanicalProfile("Colomi"),
  },
  {
    id: "INC-2026-0704",
    date: h(77),
    zone: "Vinto · Chocaya",
    lat: -17.3789,
    lng: -66.3151,
    confidence: 78,
    frp: 13.2,
    areaHa: 6.5,
    source: "MODIS",
    status: "Controlado",
    altitude: 2880,
    hydrant: { name: "Toma Chocaya", distKm: 2.2 },
    route: { state: "Ruta Habilitada", distKm: 9.8, etaMin: 21 },
    botany: getBotanicalProfile("Vinto"),
  },
];

export const HYDRANTS: { name: string; lat: number; lng: number; type?: "Hidrante GAMC" | "Represa / Laguna" | "Tanque SEMAPA" }[] = [
  { name: "Represa Wara Wara", lat: -17.287, lng: -66.215, type: "Represa / Laguna" },
  { name: "Hidrante H-114 Tiquipaya", lat: -17.335, lng: -66.215, type: "Hidrante GAMC" },
  { name: "Hidrante H-031 Costanera", lat: -17.392, lng: -66.14, type: "Hidrante GAMC" },
  { name: "Tanque SEMAPA Cota", lat: -17.362, lng: -66.1, type: "Tanque SEMAPA" },
  { name: "Laguna Macro", lat: -17.26, lng: -66.29, type: "Represa / Laguna" },
  { name: "Hidrante H-140 Quillacollo", lat: -17.39, lng: -66.275, type: "Hidrante GAMC" },
  { name: "Represa Escalerani", lat: -17.26, lng: -66.18, type: "Represa / Laguna" },
  { name: "Represa Corani", lat: -17.29, lng: -65.88, type: "Represa / Laguna" },
  { name: "Represa La Angostura", lat: -17.53, lng: -65.92, type: "Represa / Laguna" },
];

export const EVAC_ROUTES: { name: string; state: "Habilitada" | "4x4 / Tierra" | "Bloqueada"; points: [number, number][] }[] = [
  {
    name: "Brecha Cortafuegos Taquiña - Tiquipaya",
    state: "Habilitada",
    points: [[-17.30, -66.24], [-17.33, -66.235], [-17.36, -66.24], [-17.395, -66.27]],
  },
  {
    name: "Ruta de Descenso Quebrada Wara Wara",
    state: "4x4 / Tierra",
    points: [[-17.31, -66.175], [-17.34, -66.17], [-17.37, -66.16], [-17.393, -66.157]],
  },
  {
    name: "Camino Forestal Cerro Cota - Sacaba",
    state: "Habilitada",
    points: [[-17.356, -66.088], [-17.37, -66.11], [-17.39, -66.13]],
  },
  {
    name: "Sendero Alto Morochata - Liriuni",
    state: "4x4 / Tierra",
    points: [[-17.275, -66.42], [-17.295, -66.36], [-17.32, -66.30], [-17.34, -66.26]],
  },
];

// Límite aproximado del Parque Nacional Tunari (SERNAP)
export const TUNARI_BOUNDARY: [number, number][] = [
  [-17.22, -66.48], [-17.2, -66.35], [-17.21, -66.2], [-17.24, -66.08], [-17.3, -66.04],
  [-17.33, -66.1], [-17.335, -66.18], [-17.345, -66.27], [-17.36, -66.36], [-17.33, -66.46], [-17.27, -66.5],
];

export interface MunicipalityBoundary {
  id: string;
  name: string;
  province: string;
  polygon: [number, number][];
}

// Límites poligonales tácticos de los 11 municipios del eje y Parque Tunari
export const COCHABAMBA_MUNICIPALITIES_POLYGONS: MunicipalityBoundary[] = [
  {
    id: "cercado",
    name: "Cochabamba (Cercado)",
    province: "Cercado",
    polygon: [
      [-17.34, -66.19], [-17.34, -66.12], [-17.43, -66.12], [-17.44, -66.19], [-17.38, -66.21],
    ],
  },
  {
    id: "sacaba",
    name: "Sacaba",
    province: "Chapare",
    polygon: [
      [-17.32, -66.11], [-17.26, -65.95], [-17.45, -65.92], [-17.46, -66.08], [-17.37, -66.11],
    ],
  },
  {
    id: "quillacollo",
    name: "Quillacollo",
    province: "Quillacollo",
    polygon: [
      [-17.34, -66.30], [-17.33, -66.24], [-17.43, -66.24], [-17.44, -66.31],
    ],
  },
  {
    id: "tiquipaya",
    name: "Tiquipaya",
    province: "Quillacollo",
    polygon: [
      [-17.24, -66.24], [-17.24, -66.18], [-17.36, -66.18], [-17.36, -66.24],
    ],
  },
  {
    id: "colcapirhua",
    name: "Colcapirhua",
    province: "Quillacollo",
    polygon: [
      [-17.37, -66.24], [-17.37, -66.20], [-17.42, -66.20], [-17.42, -66.24],
    ],
  },
  {
    id: "vinto",
    name: "Vinto",
    province: "Quillacollo",
    polygon: [
      [-17.35, -66.35], [-17.34, -66.30], [-17.44, -66.30], [-17.45, -66.35],
    ],
  },
  {
    id: "sipesipe",
    name: "Sipe Sipe",
    province: "Quillacollo",
    polygon: [
      [-17.40, -66.42], [-17.40, -66.34], [-17.50, -66.34], [-17.50, -66.42],
    ],
  },
  {
    id: "colomi",
    name: "Colomi",
    province: "Chapare",
    polygon: [
      [-17.20, -65.95], [-17.18, -65.80], [-17.38, -65.80], [-17.38, -65.95],
    ],
  },
  {
    id: "morochata",
    name: "Morochata",
    province: "Ayopaya",
    polygon: [
      [-17.15, -66.60], [-17.15, -66.42], [-17.32, -66.42], [-17.32, -66.60],
    ],
  },
  {
    id: "tapacari",
    name: "Tapacarí",
    province: "Tapacarí",
    polygon: [
      [-17.42, -66.72], [-17.42, -66.52], [-17.58, -66.52], [-17.58, -66.72],
    ],
  },
  {
    id: "arbieto",
    name: "Arbieto / La Angostura",
    province: "Esteban Arce",
    polygon: [
      [-17.47, -66.06], [-17.47, -65.92], [-17.58, -65.92], [-17.58, -66.06],
    ],
  },
];

export interface CartographicLabel {
  label: string;
  lat: number;
  lng: number;
  id: string;
  minZoom: number;
}

// Etiquetas cartográficas permanentes de alta legibilidad
export const CARTOGRAPHIC_LABELS: readonly CartographicLabel[] = [
  { label: "COCHABAMBA (Cercado)", lat: -17.3895, lng: -66.1568, id: "cercado", minZoom: 8 },
  { label: "SACABA (Prov. Chapare)", lat: -17.4042, lng: -66.0408, id: "sacaba", minZoom: 8 },
  { label: "TIQUIPAYA", lat: -17.3380, lng: -66.2158, id: "tiquipaya", minZoom: 9 },
  { label: "QUILLACOLLO", lat: -17.3980, lng: -66.2820, id: "quillacollo", minZoom: 9 },
  { label: "COLCAPIRHUA", lat: -17.3920, lng: -66.2350, id: "colcapirhua", minZoom: 11 },
  { label: "VINTO", lat: -17.3872, lng: -66.3250, id: "vinto", minZoom: 11 },
  { label: "SIPE SIPE", lat: -17.4520, lng: -66.3620, id: "sipesipe", minZoom: 11 },
  { label: "COLOMI (Represa Corani)", lat: -17.3360, lng: -65.8710, id: "colomi", minZoom: 8 },
  { label: "MOROCHATA (Prov. Ayopaya)", lat: -17.2350, lng: -66.5260, id: "morochata", minZoom: 8 },
  { label: "ARBIETO / LA ANGOSTURA", lat: -17.5350, lng: -65.9850, id: "arbieto", minZoom: 8 },
  { label: "TAPACARÍ (Prov. Tapacarí)", lat: -17.5250, lng: -66.6100, id: "tapacari", minZoom: 8 },
] as const;

export const WEEK_SERIES = [
  { day: "15 Oct", modis: 4, viirs: 9, armonizado: 11 },
  { day: "16 Oct", modis: 6, viirs: 12, armonizado: 15 },
  { day: "17 Oct", modis: 3, viirs: 8, armonizado: 9 },
  { day: "18 Oct", modis: 7, viirs: 15, armonizado: 18 },
  { day: "19 Oct", modis: 9, viirs: 19, armonizado: 23 },
  { day: "20 Oct", modis: 11, viirs: 22, armonizado: 27 },
  { day: "21 Oct", modis: 8, viirs: 17, armonizado: 21 },
];

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/[  ]/g, " ");
}

/** Spread cone polygon from a point following wind bearing (degrees, FROM direction). */
export function spreadCone(lat: number, lng: number, windFromDeg: number, windKmh: number): [number, number][] {
  const toDeg = (windFromDeg + 180) % 360; // El fuego viaja a sotavento
  const lenKm = 1 + windKmh / 12;
  const half = 25;
  const pts: [number, number][] = [[lat, lng]];
  for (let a = -half; a <= half; a += 10) {
    const b = ((toDeg + a) * Math.PI) / 180;
    pts.push([lat + (lenKm / 111) * Math.cos(b), lng + (lenKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(b)]);
  }
  return pts;
}
