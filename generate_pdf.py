import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "CENTINELA · Sistema Táctico de Alerta Temprana de Incendios")
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "NASA Space Apps Challenge 2026")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.drawString(54, 36, "Proyecto CENTINELA — Innovación y Tecnología Espacial para la Mitigación de Desastres")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, page_str)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 8.5 * inch - 54, 46)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0B3D91"), # NASA blue
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#D97706"), # Amber/Fire
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=body_style,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=3
    )

    quote_style = ParagraphStyle(
        'QuoteStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0B3D91"),
        spaceBefore=4,
        spaceAfter=8,
        leftIndent=15,
        rightIndent=15
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.white
    )

    story = []

    # Title Banner Box
    banner_data = [
        [
            Paragraph("INFORME TÉCNICO Y ESTRATÉGICO · OPERACIÓN CENTINELA", title_style),
        ],
        [
            Paragraph("NASA Space Apps Challenge · Desafío: Harmonization of MODIS and VIIRS Hot Spots", subtitle_style),
        ],
        [
            Paragraph("<b>Plataforma de Alerta Temprana, Inteligencia Satelital y Coordinación Táctica de Incendios en Bolivia</b>", body_style)
        ]
    ]
    banner_table = Table(banner_data, colWidths=[7.0 * inch])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 12))

    # SECTION 1
    story.append(Paragraph("1. ¿Qué es CENTINELA y cuál es su finalidad?", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    
    story.append(Paragraph(
        "<b>CENTINELA</b> es un <b>Centro de Mando Táctico y Plataforma de Alerta Temprana contra Incendios Forestales</b>, "
        "diseñado específicamente para optimizar la toma de decisiones y acelerar la respuesta operativa ante quemas e incendios en Bolivia. "
        "El proyecto posee un enfoque de alta prioridad en áreas protegidas y zonas críticas (tales como el <b>Parque Nacional Tunari</b> "
        "y el <b>Gobierno Autónomo Municipal de Cochabamba - GAMC</b>), contando a su vez con soporte y cobertura para los <b>nueve departamentos del país</b>.",
        body_style
    ))

    # Quote Box
    quote_data = [[Paragraph('<i>"Los datos satelitales por sí solos informan; cruzados con los recursos del municipio y el terreno, operan."</i>', quote_style)]]
    quote_table = Table(quote_data, colWidths=[7.0 * inch])
    quote_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(quote_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Finalidades Principales:</b>", h2_style))
    story.append(Paragraph("• <b>Reducción del tiempo de respuesta:</b> Identificación y triangulación temprana de anomalías térmicas satelitales antes de que los focos se propaguen a zonas habitadas o boscosas.", bullet_style))
    story.append(Paragraph("• <b>Operativización de datos satelitales:</b> Mientras la NASA aporta coordenadas y potencia calórica desde el espacio, CENTINELA calcula de forma automatizada las fuentes de agua e hidrantes más próximos (represas, lagunas, tanques SEMAPA, pozos) y el estado de transitabilidad de las rutas de aproximación (habilitada, restringida o solo a pie).", bullet_style))
    story.append(Paragraph("• <b>Integración Multiescala:</b> Conecta a la ciudadanía (mediante un portal de consulta libre y semáforo preventivo) con brigadistas en terreno (mediante una interfaz móvil y canal seguro con geoposicionamiento SOS).", bullet_style))
    story.append(Spacer(1, 10))

    # SECTION 2
    story.append(Paragraph("2. Alineación Estratégica con el Reto de la NASA", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph(
        "El proyecto responde de forma directa al reto oficial <b>Harmonization of MODIS and VIIRS Hot Spots</b> (Armonización de focos MODIS y VIIRS), "
        "superando la fragmentación de datos mediante la sincronización simultánea de múltiples sensores y productos espaciales:",
        body_style
    ))

    story.append(Paragraph("• <b>NASA FIRMS (Fire Information for Resource Management System):</b> Ingesta y armoniza detecciones de <b>VIIRS</b> (375 m de resolución espacial, alta sensibilidad) y <b>MODIS</b> (1 km, continuidad temporal histórica) en tiempo real con FRP (Fire Radiative Power en MW) y porcentaje de confianza.", bullet_style))
    story.append(Paragraph("• <b>NASA POWER:</b> Ingesta de parámetros meteorológicos diarios geolocalizados: temperatura a 2m (T2M), humedad relativa (RH2M), velocidad (WS10M) y dirección del viento (WD10M). Alimenta el cálculo del índice de riesgo de ignición y los vectores de propagación.", bullet_style))
    story.append(Paragraph("• <b>NASA GIBS (Global Imagery Browse Services):</b> Renderizado de mosaicos WMTS con reflectancia True Color (VIIRS) y capas de anomalías térmicas en tiempo real.", bullet_style))
    story.append(Paragraph("• <b>NASA EONET (Earth Observatory Natural Event Tracker):</b> Seguimiento de eventos abiertos de incendios forestales categorizados a escala regional.", bullet_style))
    story.append(Spacer(1, 10))

    # SECTION 3
    story.append(Paragraph("3. Stack Tecnológico y Arquitectura del Sistema", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    
    story.append(Paragraph("<b>A. Frontend & Core Framework:</b>", h2_style))
    story.append(Paragraph("• <b>TanStack Start (Nitro + Vite):</b> Arquitectura fullstack moderna con Server-Side Rendering (SSR) y funciones de servidor tipadas de extremo a extremo.", bullet_style))
    story.append(Paragraph("• <b>React 19 & TypeScript 5.8:</b> Base sólida con control de tipos estricto para lógica geoespacial, cálculo de riesgos y manejo de errores.", bullet_style))
    story.append(Paragraph("• <b>TanStack Router & Query:</b> Enrutamiento file-based fuertemente tipado y caché asíncrona sincronizada entre servidor y cliente (dehydrate/hydrate).", bullet_style))
    story.append(Paragraph("• <b>Tailwind CSS v4 & Radix UI:</b> Sistema de diseño táctico 'Dark Mode' militar/aeroespacial con alto contraste para legibilidad en situaciones de estrés.", bullet_style))

    story.append(Paragraph("<b>B. Geomática & Computación Espacial:</b>", h2_style))
    story.append(Paragraph("• <b>Leaflet & Leaflet.VectorGrid:</b> Motor cartográfico interactivo optimizado para SSR con carga dinámica asíncrona de capas vectoriales y ráster.", bullet_style))
    story.append(Paragraph("• <b>Mapas Base Satelitales ESRI World Imagery:</b> Ortofotos de alta resolución satelital integradas con capas oscuras vectoriales.", bullet_style))
    story.append(Paragraph("• <b>Turf.js:</b> Geodesia computacional para distancias punto a punto y proyecciones de avance del fuego a sotavento a horizontes de 1h, 3h y 6h.", bullet_style))
    story.append(Paragraph("• <b>geoBoundaries (GeoJSON ADM1):</b> Polígonos oficiales de los 9 departamentos de Bolivia para indexación espacial 'Point-in-Polygon' precisa.", bullet_style))

    story.append(Paragraph("<b>C. Backend, Base de Datos y Audio:</b>", h2_style))
    story.append(Paragraph("• <b>TanStack Server Functions (createServerFn):</b> Capa intermedia con caché en memoria (TTL) que consulta las APIs de la NASA sin exponer claves de acceso ni sobrepasar cuotas.", bullet_style))
    story.append(Paragraph("• <b>Supabase (PostgreSQL + RLS):</b> Autenticación OAuth (Google / Lovable) y almacenamiento de reportes de campo bajo políticas Row Level Security estrictas (las coordenadas SOS son privadas del emisor).", bullet_style))
    story.append(Paragraph("• <b>Supabase Realtime:</b> Canal de comunicación bidireccional en vivo vía WebSockets.", bullet_style))
    story.append(Paragraph("• <b>Web Audio API:</b> Síntesis de frecuencia en el navegador para emitir sirenas de alarma tácticas (opt-in para cumplir con políticas del navegador).", bullet_style))
    story.append(Paragraph("• <b>Recharts & Criptografía:</b> Gráficos analíticos interactivos y generación de hashes SHA-256 para auditoría de reportes.", bullet_style))
    story.append(Spacer(1, 10))

    # SECTION 4
    story.append(Paragraph("4. Módulos y Funcionalidades Clave", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))

    story.append(Paragraph("<b>1. Centro de Mando Táctico (/dashboard):</b> Visualización en 3 paneles. Integra telemetría meteorológica NASA POWER, medidor de ignición en tiempo real (RiskGauge), selección departamental, visualización de focos, trazado de rutas a hidrantes, control de capas satelitales y modelado de escenarios exploratorios a 1h, 3h y 6h.", body_style))
    story.append(Paragraph("<b>2. Vista Móvil de Respuesta Rápida (/movil):</b> Diseñada específicamente para brigadistas y personal de patrullaje con pantalla táctil, listado de focos activos, geolocalización instantánea y barra de acción rápida.", body_style))
    story.append(Paragraph("<b>3. Ficha Técnica de Alerta (/alerta/:id):</b> Detalle técnico de cada foco satelital: fecha y hora de adquisición, coordenadas geográficas, valor FRP en Megavatios, porcentaje de confiabilidad, departamento, hidrante más cercano y transitabilidad del camino.", body_style))
    story.append(Paragraph("<b>4. Canal de Campo & Botón de Pánico SOS:</b> Permite a los brigadistas registrar novedades y emitir llamados de auxilio con geolocalización GPS de precisión (±X m) y consentimiento explícito, generando mensajes formateados listos para WhatsApp o llamadas directas al 119 (Bomberos) o 110 (Policía).", body_style))
    story.append(Paragraph("<b>5. Portal de Consulta Ciudadana (/publico):</b> Acceso abierto y transparente para vecinos y comunidades. Muestra el semáforo de riesgo por zona, recomendaciones de prevención y el directorio de contactos oficiales de emergencia y COE departamentales.", body_style))
    story.append(Paragraph("<b>6. Reportes y Auditoría Estratégica (/reportes):</b> Analítica integral con series temporales (MODIS vs. VIIRS vs. EONET), conteo departamental, cálculo de FRP acumulado y exportación de reportes sellados criptográficamente con hash SHA-256.", body_style))
    story.append(Paragraph("<b>7. Estrategia y Operación (/proyecto):</b> Presentación interactiva del proyecto, los 4 pilares fundamentales, arquitectura de flujo de datos y hoja de ruta del hackathon.", body_style))
    story.append(Spacer(1, 10))

    # SECTION 5
    story.append(Paragraph("5. Principios de Seguridad Operacional y Ética de Datos", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("• <b>Etiquetado Riguroso 'Por Verificar en Campo':</b> Ninguna detección satelital se asume como incendio confirmado sin validación física; no se emiten órdenes de evacuación sin autoridad competente.", bullet_style))
    story.append(Paragraph("• <b>Exclusión Estricta de Falsas Alarmas:</b> Las sirenas y alertas de alta prioridad solo se disparan ante detecciones satelitales reales frescas (antigüedad máxima de 48 horas a menos de 5 km de centros poblados); los datos de prueba o demo jamás activan alarmas sonoras.", bullet_style))
    story.append(Paragraph("• <b>Protección de Privacidad de Brigadistas:</b> Coordenadas de reportes ciudadanos y de patrullas se almacenan con Row Level Security (RLS); ningún usuario no autorizado puede rastrear la ubicación privada de los participantes.", bullet_style))
    story.append(Paragraph("• <b>Transparencia Heurística en Modelos de Fuego:</b> Los escenarios de avance a 1h/3h/6h se declaran con total transparencia como envolventes de viento exploratorias, evitando reclamos infundados de 'inteligencia artificial predictiva' sin validación de combustible y terreno.", bullet_style))
    story.append(Spacer(1, 12))

    # SECTION 6 - TABLE
    story.append(Paragraph("6. Resumen Ejecutivo para el Pitch del Equipo", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))

    table_data = [
        [
            Paragraph("DIMENSIÓN", table_header),
            Paragraph("PROPUESTA DE VALOR DE CENTINELA", table_header)
        ],
        [
            Paragraph("<b>Problema Detectado</b>", table_cell),
            Paragraph("Los datos satelitales tardan en llegar a los equipos de primera respuesta en Bolivia y carecen de contexto logístico (hidrantes, accesibilidad, rutas).", table_cell)
        ],
        [
            Paragraph("<b>Solución Innovadora</b>", table_cell),
            Paragraph("Plataforma interactiva que armoniza en tiempo real MODIS + VIIRS + POWER + GIBS y los cruza con infraestructura municipal y brigadas en terreno.", table_cell)
        ],
        [
            Paragraph("<b>Impacto Operativo</b>", table_cell),
            Paragraph("Conexión directa entre la órbita espacial y el hidrante municipal: reduce drásticamente el tiempo de movilización de cuadrillas y resguarda los bosques.", table_cell)
        ],
        [
            Paragraph("<b>Innovación Técnica</b>", table_cell),
            Paragraph("Fullstack TanStack Start (SSR) con caché inteligente, Leaflet dinámico, algoritmos de geodesia Turf.js, Web Audio API y base de datos Supabase con RLS.", table_cell)
        ],
        [
            Paragraph("<b>Usuarios Finales</b>", table_cell),
            Paragraph("Centros de Operaciones de Emergencia (COE), Bomberos, Brigadas voluntarias de respuesta rápida y ciudadanía general.", table_cell)
        ]
    ]

    pitch_table = Table(table_data, colWidths=[2.2 * inch, 4.8 * inch])
    pitch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0B3D91")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
    ]))
    story.append(pitch_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado con éxito en: {filename}")

if __name__ == '__main__':
    target_path = r"C:\Users\rodri\Desktop\APP WEBS\centinelas\Informe_CENTINELA_NASA_Space_Apps.pdf"
    build_pdf(target_path)
