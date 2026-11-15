# 🚒 Guía Operativa de Respuesta Táctica Municipal · GAMC
### Sistema CENTINELA · Parque Nacional Tunari (Cochabamba, Bolivia)

---

## 1. Objetivo Operativo
Proveer al personal de la **Unidad de Gestión de Riesgos (UGR)** del Gobierno Autónomo Municipal de Cochabamba (GAMC), **Bomberos de la Policía 119**, **SAR Bolivia** y guardaparques del **SERNAP** un protocolo estandarizado de actuación inmediata ante alertas satelitales y condiciones meteorológicas extremas en la cordillera del Tunari.

---

## 2. Niveles de Alerta y Apresto Preventivo

| Nivel de Alerta | Condición Termodinámica y Satelital | Acción Táctica Municipal Inmediata |
| :--- | :--- | :--- |
| **VERDE (Monitoreo)** | Índice Ångström $> 4.0$ · Humedad $> 40\%$ · Sin anomalías térmicas | Monitoreo pasivo por radar y rondas rutinarias en miradores. |
| **AMARILLA (Precaución)** | Temperatura $> 25^\circ\text{C}$ · Humedad $20\% - 30\%$ · Viento $> 20\text{ km/h}$ | Posicionamiento de personal en torres de vigía y verificación de hidrantes. |
| **NARANJA (Apresto)** | Detección aislada VIIRS (375m) o MODIS (1.000m) no corroborada | Despacho de patrulla de verificación ligera en motocicleta o 4x4. |
| **ROJA (EMERGENCIA)** | **Regla 30-30-30 activa** o **Detección Dual Armonizada MODIS+VIIRS ($>90\%$ confianza)** | **Despacho inmediato de autobomba** hacia el hidrante más cercano y activación de sirena. |

---

## 3. Protocolo de Despacho Táctico con Ficha ICS-209
1. **Identificación en el Centro de Mando (`/dashboard`):**
   - El operador selecciona el foco térmico en el mapa o en la lista lateral.
   - Revisa el cálculo de **Potencia Radiativa (FRP)** y la **demanda estimada de agua en litros**.
2. **Despacho WhatsApp:**
   - Hacer clic en el botón `[ 📲 Despachar Brigada WhatsApp ]`.
   - Se abre el enlace con la ficha preformateada conteniendo coordenadas GPS exactas, ruta a hidrante y volumen de ataque requerido.
3. **Logística Hídrica:**
   - Verificar la distancia geodésica al punto de abastecimiento municipal más próximo (Represa Escalerani, Laguna San José, Toma Taquiña, Cisterna GAMC).
   - Coordinar el reabastecimiento continuo con los camiones cisterna en apresto.

---

## 4. Integración con el Sistema de Información Geográfica (SIG) Municipal
1. En el encabezado del Centro de Mando, hacer clic en `[ 📥 GeoJSON SIG ]`.
2. Abrir **QGIS** o **ArcGIS Pro** en la estación de trabajo de la UGR o Planificación Territorial.
3. Arrastrar el archivo `.geojson` descargado al panel de capas.
4. Se visualizarán automáticamente los centroides térmicos armonizados a 375m, los perímetros aproximados y los atributos de severidad térmica para la toma de decisiones territoriales.
