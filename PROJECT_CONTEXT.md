# RoboKinetic 3D

Simulador web interactivo en 3D de un brazo robótico articulado antropomórfico (3R / 3 DOF) desarrollado con React, Three.js y Tailwind CSS.

## 📌 Objetivos y Estado del Proyecto

1. **Control Articular Interactivo (Cinemática Directa 3 DOF):**
   - **Articulación 1 (Base / J1):** Servomotor de rotación horizontal (Yaw / Azimuth, $\theta_1 \in [-180^\circ, 180^\circ]$).
   - **Articulación 2 (Hombro / J2):** Servomotor de elevación/inclinación vertical (Pitch, $\theta_2 \in [-20^\circ, 100^\circ]$) montado con soporte horquilla (twin bracket).
   - **Articulación 3 (Codo / J3):** Servomotor de flexión/extensión del antebrazo (Pitch relativo, $\theta_3 \in [-120^\circ, 60^\circ]$) acoplado al extremo de $L_1$.
   - **Efector Final (TCP):** Cabezal con pinza gripper de agarre mecánico y esfera indicadora de Tool Center Point $(X, Y, Z)$.
   - Regulación interactiva de longitudes de eslabones ($L_1$ húmero y $L_2$ antebrazo).

2. **Panel Analítico y Telemetría Matemática en Vivo:**
   - Desglose trigonométrico paso a paso de la elevación coplanar ($r_{xy}$ y $Z$).
   - Proyección 3D espacial con el ángulo de la base ($X = r_{xy} \cos \theta_1$, $Y = r_{xy} \sin \theta_1$, $Z$).
   - Verificación inversa en el plano de la mesa (Pitágoras y $\text{atan2}$).
   - Distancia esférica 3D euclídea ($\rho$), ángulo de elevación ($\phi$) y relación angular por ley de cosenos.
   - Monitoreo en vivo de par gravitatorio relativo de los servomotores.

3. **Entorno 3D y Modelado Físico CAD:**
   - Representación geométrica realista de cada servomotor industrial (carcasa prismática/cilíndrica, tapas mecanizadas, bridas circulares rotativas con pernos y acoples).
   - Cotas ortogonales tridimensionales proyectadas (Cota X, Cota Y, Cota Z de caída, triángulo ortogonal en mesa y vector espacial directo $\rho$).
   - Vistas predefinidas de cámara (Isométrica, Planta X-Y, Frontal, Lateral).
   - Presets de posturas del robot (Home, Inspección 45°, Extendido, Pick).
   - Soporte para Tema Claro (SOLIDWORKS Classic) y Tema Oscuro (SOLIDWORKS Dark).

4. **Siguientes Fases:**
   - Rutina automatizada de Pick & Place con máquina de estados y trayectorias interpoladas.
   - Muñeca articulada y control de orientación del efector final.
