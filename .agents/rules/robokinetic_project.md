# RoboKinetic 3D - Contexto y Especificación del Proyecto

## 1. Visión General
**RoboKinetic 3D** es un simulador web interactivo en 3D de un brazo robótico articulado de configuración angular (antropomórfico/esférico), diseñado para ejecutarse en el navegador con tecnologías web modernas (**React, Three.js / React Three Fiber y Tailwind CSS**).

## 2. Propósito y Enfoque Pedagógico / Técnico
Herramienta de experimentación técnica y didáctica que conecta la computación gráfica tridimensional con los fundamentos físicos y matemáticos de la robótica. Permite visualizar, analizar y validar en tiempo real cómo las transformaciones geométricas y los modelos analíticos gobiernan el movimiento de un manipulador mecánico en el espacio cartesiano.

## 3. Pilares y Requerimientos Clave

### A. Control Articular Interactivo (Cinemática Directa)
- Manipulación manual de articulaciones:
  - Base ($\theta_1$ / rotación azimutal)
  - Hombro ($\theta_2$ / elevación)
  - Codo ($\theta_3$ / flexión)
  - Efector final / Muñeca / Pinza ($\theta_4$ y apertura/cierre de gripper)
- Cálculo y despliegue en tiempo real de la posición cartesiana $(X, Y, Z)$ del efector final mediante relaciones trigonométricas y matrices de transformación homogénea.

### B. Panel Analítico y Telemetría Matemática en Vivo
- Visualización interactiva paso a paso de las operaciones matemáticas subyacentes:
  - Conversión bidireccional entre coordenadas cilíndricas/esféricas y cartesianas.
  - Teorema de Pitágoras para cálculo de distancias y radios proyectados ($r = \sqrt{x^2 + y^2}$, etc.).
  - Funciones trigonométricas directas ($\sin, \cos$) y arco tangente (`atan2(y, x)`).
  - Desglose algebraico y numérico dinámico conforme el brazo se mueve.

### C. Rutina Automatizada de Pick & Place (Máquina de Estados e Interpolación)
- Secuencia autónoma de manipulación industrial:
  1. Detección/posicionamiento sobre objeto en coordenadas predefinidas.
  2. Aproximación y descenso.
  3. Cierre de pinza / sujeción.
  4. Elevación y traslado a la zona destino.
  5. Descenso y apertura de pinza (liberación suave).
  6. Retorno a posición home/espera.
- Transiciones continuas mediante interpolación angular / easing / tweening.

### D. Simulación Visual y Entorno 3D
- Renderizado en tiempo real con sombras e iluminación ambiental/direccional realista.
- Cuadrícula métrica de referencia (grid de trabajo en milímetros/metros).
- Proyecciones de vectores de posición sobre los planos coordenados ($XY$, $XZ$, $YZ$).
- Control orbital de cámara (OrbitControls) con límites y vistas predeterminadas (perspectiva, superior, frontal, lateral).
