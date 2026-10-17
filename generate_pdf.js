import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 20;
const contentWidth = pageWidth - margin * 2;
let y = 22;

function checkPageBreak(neededHeight) {
  if (y + neededHeight > pageHeight - 22) {
    doc.addPage();
    y = 24;
    renderHeaderSmall();
  }
}

function renderHeaderSmall() {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('RoboKinetic 3D · Informe Técnico Fase 1 (Funcionamiento y Desarrollo)', margin, 14);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, 16, pageWidth - margin, 16);
}

// ==========================================
// PÁGINA 1: PORTADA Y ENCABEZADO
// ==========================================

// Barra de acento superior
doc.setFillColor(37, 99, 235); // #2563eb
doc.rect(margin, y, contentWidth, 3, 'F');
y += 10;

// Título Principal
doc.setFont('helvetica', 'bold');
doc.setFontSize(22);
doc.setTextColor(15, 23, 42); // #0f172a
doc.text('RoboKinetic 3D', margin, y);
y += 7;

doc.setFont('helvetica', 'normal');
doc.setFontSize(12);
doc.setTextColor(71, 85, 105); // #475569
doc.text('Informe Técnico de Funcionamiento y Desarrollo · Fase 1', margin, y);
y += 6;

// Metadatos
doc.setFont('courier', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(100, 116, 139);
doc.text('DOC: RPT-RK3D-01  |  SISTEMA: Cinemática J1  |  ESTADO: Aprobado  |  OCTUBRE 2026', margin, y);
y += 4;

doc.setDrawColor(203, 213, 225);
doc.setLineWidth(0.4);
doc.line(margin, y, pageWidth - margin, y);
y += 8;

// SECCIÓN 1: INTRODUCCIÓN Y PROPÓSITO
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(30, 41, 59);
doc.text('1. Propósito General del Sistema', margin, y);
y += 6;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(51, 65, 85);
const p1 = 'RoboKinetic 3D es un simulador cinemático tridimensional diseñado para ejecutarse directamente en el navegador web. Su objetivo es salvar la brecha conceptual entre el espacio articular de un robot físico y el espacio de trabajo euclídeo cartesiano donde interactúa con su entorno.';
const p1Lines = doc.splitTextToSize(p1, contentWidth);
doc.text(p1Lines, margin, y);
y += p1Lines.length * 5 + 3;

const p2 = 'En esta primera fase se implementó el modelo analítico y la representación 3D del primer eslabón del robot (articulación de base giratoria J1 con extensión radial r). El sistema traduce de manera continua e interactiva las rotaciones del servomotor hacia posiciones métricas en una mesa de trabajo plana.';
const p2Lines = doc.splitTextToSize(p2, contentWidth);
doc.text(p2Lines, margin, y);
y += p2Lines.length * 5 + 6;

// SECCIÓN 2: FUNDAMENTOS MATEMÁTICOS Y CINEMÁTICA
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(30, 41, 59);
doc.text('2. Fundamentación Matemática y Modelado Cinemático', margin, y);
y += 6;

// 2.1 Cinemática Directa
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(37, 99, 235);
doc.text('2.1. Cinemática Directa: Coordenadas Polares (r, θ) a Cartesianas (X, Y)', margin, y);
y += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(51, 65, 85);
const pDirect = 'Permite predecir en qué punto de la mesa (X, Y) aterrizará la herramienta conociendo el ángulo de giro de la base (θ) y la longitud del brazo (r):';
doc.text(pDirect, margin, y);
y += 5;

// Caja de fórmula X
doc.setFillColor(248, 250, 252);
doc.setDrawColor(203, 213, 225);
doc.rect(margin, y, contentWidth, 12, 'FD');
doc.setFont('courier', 'bold');
doc.setFontSize(10);
doc.setTextColor(4, 120, 87); // Eje X verde
doc.text('X = r · cos(θ)', margin + 4, y + 5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
doc.text('Proyección horizontal sobre el eje X. Determina el desplazamiento lateral del efector.', margin + 4, y + 9.5);
y += 15;

// Caja de fórmula Y
doc.setFillColor(248, 250, 252);
doc.setDrawColor(203, 213, 225);
doc.rect(margin, y, contentWidth, 12, 'FD');
doc.setFont('courier', 'bold');
doc.setFontSize(10);
doc.setTextColor(67, 56, 202); // Eje Y índigo
doc.text('Y = r · sin(θ)', margin + 4, y + 5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
doc.text('Proyección longitudinal sobre el eje Y. Determina el avance en profundidad hacia el frente o fondo.', margin + 4, y + 9.5);
y += 16;

// 2.2 Cinemática Inversa
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(37, 99, 235);
doc.text('2.2. Cinemática Inversa: Coordenadas Cartesianas (X, Y) a Polares (r, θ)', margin, y);
y += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(51, 65, 85);
const pInv = 'Calcula qué comandos de posición debe ejecutar el manipulador para alcanzar un objetivo físico determinado en la mesa de coordenadas:';
doc.text(pInv, margin, y);
y += 5;

// Caja Pitágoras
doc.setFillColor(248, 250, 252);
doc.setDrawColor(203, 213, 225);
doc.rect(margin, y, contentWidth, 12, 'FD');
doc.setFont('courier', 'bold');
doc.setFontSize(10);
doc.setTextColor(29, 78, 216); // Azul CAD
doc.text('r = √(X² + Y²)', margin + 4, y + 5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
doc.text('Teorema de Pitágoras: calcula la hipotenusa requerida (extensión necesaria del eslabón).', margin + 4, y + 9.5);
y += 15;

// Caja atan2
doc.setFillColor(248, 250, 252);
doc.setDrawColor(203, 213, 225);
doc.rect(margin, y, contentWidth, 14, 'FD');
doc.setFont('courier', 'bold');
doc.setFontSize(10);
doc.setTextColor(180, 83, 9); // Ámbar
doc.text('θ = atan2(Y, X)', margin + 4, y + 5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
const atan2Desc = 'Función arco tangente de 4 cuadrantes. Resuelve el ángulo en [-π, +π] radianes (-180° a +180°), distinguiendo el cuadrante exacto sin error por división entre cero.';
const atan2Lines = doc.splitTextToSize(atan2Desc, contentWidth - 8);
doc.text(atan2Lines, margin + 4, y + 9);
y += 18;

// Nota técnica destacada sobre precisión a 45°
doc.setFillColor(239, 246, 255);
doc.setDrawColor(37, 99, 235);
doc.rect(margin, y, contentWidth, 22, 'FD');
doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(29, 78, 216);
doc.text('VALIDACIÓN DE PRECISIÓN GEOMÉTRICA (Caso de prueba: θ = 45°, r = 5.0 m)', margin + 4, y + 5);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(30, 58, 138);
const precText = 'A un ángulo de 45° con radio r = 5.0 m, los catetos resultan exactamente en X = 5.0 · cos(45°) ≈ 3.536 m e Y = 5.0 · sin(45°) ≈ 3.536 m. En una retícula con marcas cada 0.50 m, la punta sobrepasa la esquina (3.50, 3.50) por 3.6 cm, interceptando de forma idéntica el 5° anillo del radar polar (√(3.536² + 3.536²) = 5.000 m). Esto valida el cálculo continuo del motor matemático.';
const precLines = doc.splitTextToSize(precText, contentWidth - 8);
doc.text(precLines, margin + 4, y + 9.5);

// ==========================================
// PÁGINA 2: ARQUITECTURA DE SOFTWARE Y DESARROLLO
// ==========================================
doc.addPage();
y = 24;
renderHeaderSmall();

doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(30, 41, 59);
doc.text('3. Arquitectura del Software y Componentes Desarrollados', margin, y);
y += 6;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(51, 65, 85);
const archText = 'La solución se diseñó con una arquitectura desacoplada donde el cálculo matemático analítico es independiente de la interfaz gráfica y del motor de renderizado 3D. Esto garantiza precisión, modularidad y facilidad para escalar hacia los siguientes eslabones.';
const archLines = doc.splitTextToSize(archText, contentWidth);
doc.text(archLines, margin, y);
y += archLines.length * 4.5 + 4;

// Tabla de Componentes
const col1 = 52;
const col2 = 32;
const col3 = contentWidth - col1 - col2;

doc.setFillColor(241, 245, 249);
doc.setDrawColor(203, 213, 225);
doc.rect(margin, y, contentWidth, 7, 'FD');
doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(15, 23, 42);
doc.text('Módulo / Archivo', margin + 3, y + 4.5);
doc.text('Tecnología', margin + col1 + 3, y + 4.5);
doc.text('Responsabilidad y Funcionamiento', margin + col1 + col2 + 3, y + 4.5);
y += 7;

const modules = [
  {
    name: 'src/kinematics.js',
    tech: 'JavaScript ES6',
    desc: 'Cerebro matemático analítico puro. Implementa polarToCartesian, cartesianToPolar, conversiones deg/rad y getKinematicsTelemetry con sustitución numérica paso a paso.',
  },
  {
    name: 'src/components/PropertyManager.jsx',
    tech: 'React / Tailwind',
    desc: 'Panel lateral izquierdo de control. Gestiona la entrada doble (deslizadores analógicos y cajas numéricas directas para θ y r) y muestra las cotas cartesianas calculadas.',
  },
  {
    name: 'src/components/Viewport3D.jsx',
    tech: 'Three.js / WebGL',
    desc: 'Lienzo 3D interactivo. Renderiza el ensamblaje PBR, radar polar concéntrico, cotas ortogonales dinámicas, línea vertical de caída (drop line) y cámaras de perspectiva.',
  },
  {
    name: 'src/components/MathReportPanel.jsx',
    tech: 'React / Tailwind',
    desc: 'Panel lateral derecho. Terminal técnica en tiempo real que desglosa la cinemática directa, la comprobación inversa (Pitágoras y atan2) y las notas de precisión.',
  },
  {
    name: 'src/components/Header.jsx',
    tech: 'React / Lucide',
    desc: 'Barra superior CAD. Controla los preajustes de ángulos (0°, 45°, 90°, 180°), restablecimiento a posición Home, selector de vistas ortogonales y alternador de tema.',
  },
  {
    name: 'src/App.jsx',
    tech: 'React State Engine',
    desc: 'Coordinador central reactivo. Sincroniza el estado de las variables (r, θ) entre el módulo matemático, el visor 3D y los paneles a 60 fotogramas por segundo.',
  },
];

modules.forEach((mod) => {
  const descLines = doc.splitTextToSize(mod.desc, col3 - 6);
  const rowHeight = Math.max(10, descLines.length * 3.8 + 4);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, rowHeight, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text(mod.name, margin + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(mod.tech, margin + col1 + 3, y + 5);

  doc.text(descLines, margin + col1 + col2 + 3, y + 4.5);
  y += rowHeight;
});

y += 8;

// SECCIÓN 4: MOTOR GRÁFICO 3D Y TRANSFORMACIONES ESPACIALES
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(30, 41, 59);
doc.text('4. Motor Gráfico 3D y Representación Espacial', margin, y);
y += 6;

const graphicsPoints = [
  {
    title: 'Mapeo de Coordenadas:',
    text: 'En Three.js, el plano de trabajo horizontal se representó en los ejes X y -Z (donde -Z corresponde al eje cartesiano Y). Esto asegura que un giro antihorario estándar coincida con la rotación física positiva del grupo de la articulación (rotation.y = rad).',
  },
  {
    title: 'Cotas Ortogonales Dinámicas y Triángulo Descompuesto:',
    text: 'Se actualizan dinámicamente dos segmentos de línea punteada (lineX y lineY) desde el centro del efector hacia los ejes de referencia, generando en el suelo un triángulo translúcido que ilustra el principio trigonométrico en tiempo real.',
  },
  {
    title: 'Línea de Caída Vertical (Drop Line) y Diana en Suelo:',
    text: 'Un trazo vertical punteado desciende desde el centro de la esfera del efector final hasta un anillo objetivo en el plano de piso (Y=0), permitiendo evaluar la proyección ortogonal independientemente de la elevación o ángulo de cámara.',
  },
  {
    title: 'Vistas Ortogonales CAD Integradas:',
    text: 'Se incorporaron controladores de cámara instantáneos: Vista Isométrica (perspectiva 3D global), Vista de Planta X-Y (cenital superior alineada para verificación 2D) y Vista Frontal a nivel de bancada.',
  },
];

graphicsPoints.forEach((pt) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('• ' + pt.title, margin + 2, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const textLines = doc.splitTextToSize(pt.text, contentWidth - 8);
  doc.text(textLines, margin + 6, y + 4);
  y += textLines.length * 3.8 + 6;
});

y += 4;

// SECCIÓN 5: CONCLUSIÓN Y PRÓXIMAS FASES
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(30, 41, 59);
doc.text('5. Conclusión y Ruta de Desarrollo (Fase 2)', margin, y);
y += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(51, 65, 85);
const concText = 'La Fase 1 queda concluida exitosamente, disponiendo de una base analítica sólida y un simulador operativo. La arquitectura desarrollada servirá como cimiento directo para la Fase 2, en la que se integrará el eslabón de elevación del hombro (J2) y el codo (J3) para completar la cinemática espacial tridimensional (X, Y, Z) mediante matrices de transformación homogénea de Denavit-Hartenberg.';
const concLines = doc.splitTextToSize(concText, contentWidth);
doc.text(concLines, margin, y);

// Pie de página para todas las páginas
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`RoboKinetic 3D  |  Informe Técnico Fase 1  |  Página ${i} de ${totalPages}`, margin, pageHeight - 10);
  doc.text('CONFIDENCIAL / ACADÉMICO', pageWidth - margin - 45, pageHeight - 10);
}

// Guardar el PDF en disco
const outputPath = path.resolve('RoboKinetic_3D_Informe_Fase_1.pdf');
const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
console.log('PDF generado exitosamente en:', outputPath);
