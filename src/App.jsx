import React, { useState, useMemo, useEffect } from 'react';
import { Sliders, Box, Calculator } from 'lucide-react';
import Header from './components/Header';
import PropertyManager from './components/PropertyManager';
import Viewport3D from './components/Viewport3D';
import MathReportPanel from './components/MathReportPanel';
import { getKinematicsTelemetry } from './kinematics';
import { usePickAndPlace } from './hooks/usePickAndPlace';

export default function App() {
  // 1. Selector de Tema (Light / Dark Mode con persistencia en localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('robokinetic_cad_theme') || 'dark';
  });

  // Modo de visualización en teléfonos móviles: 'split' (3D + Sliders), '3d' (Solo 3D), 'math' (Cálculos)
  const [mobileTab, setMobileTab] = useState('split');

  useEffect(() => {
    localStorage.setItem('robokinetic_cad_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 2. Parámetros cinemáticos articulares (3 DOF: Base, Hombro, Codo)
  // Postura inicial Home de seguridad industrial (J1: 0°, J2: 100°, J3: -120°)
  const [theta1Deg, setTheta1Deg] = useState(0.0); // J1: Giro Base
  const [theta2Deg, setTheta2Deg] = useState(100.0); // J2: Elevación Hombro
  const [theta3Deg, setTheta3Deg] = useState(-120.0); // J3: Flexión Codo

  // 3. Efector Final: Pinza / Gripper Industrial (Apertura 0 mm a 40 mm, reposo neutro inicial en 14 mm)
  const [gripperAperture, setGripperAperture] = useState(14.0);

  // 4. Parámetros estructurales de eslabones (Proporción armónica con la base del manipulador)
  const [l1, setL1] = useState(1.75); // Eslabón 1 (Brazo - 1.75m)
  const [l2, setL2] = useState(1.45); // Eslabón 2 (Antebrazo - 1.45m)
  const hBase = 0.60; // Altura del pedestal de la base al eje del hombro (0.60m)

  // 5. Orquestador y Máquina de Estados de Pick & Place
  const pickAndPlace = usePickAndPlace({
    setTheta1Deg,
    setTheta2Deg,
    setTheta3Deg,
    setGripperAperture,
    l1,
    l2,
    hBase,
  });

  // 6. Disparador de cambio de vista de cámara (Isométrica, Planta, Frontal, Lateral)
  const [cameraViewTrigger, setCameraViewTrigger] = useState(null);

  const handleSetCameraView = (viewName) => {
    setCameraViewTrigger({ view: viewName, timestamp: Date.now() });
  };

  // 7. Cálculo matemático cinemático en tiempo real
  const telemetry = useMemo(() => {
    return getKinematicsTelemetry({
      theta1Deg,
      theta2Deg,
      theta3Deg,
      l1,
      l2,
      hBase,
    });
  }, [theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase]);

  // Restablecer parámetros a valores de fábrica (Home industrial)
  const handleReset = () => {
    pickAndPlace.resetCube();
    setTheta1Deg(0.0);
    setTheta2Deg(100.0);
    setTheta3Deg(-120.0);
    setGripperAperture(14.0);
    setL1(1.75);
    setL2(1.45);
    handleSetCameraView('isometric');
  };

  // Ajustar postura predeterminada del robot
  const handlePosePreset = ({ t1, t2, t3, grip }) => {
    if (t1 !== undefined) setTheta1Deg(t1);
    if (t2 !== undefined) setTheta2Deg(t2);
    if (t3 !== undefined) setTheta3Deg(t3);
    if (grip !== undefined) setGripperAperture(grip);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden theme-${theme} ${
        theme === 'dark' ? 'bg-[#0f172a] text-[#f8fafc]' : 'bg-[#f8fafc] text-[#0f172a]'
      }`}
    >
      {/* Barra de herramientas superior */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onReset={handleReset}
        onSetCameraView={handleSetCameraView}
      />

      {/* Área de trabajo CAD:
          - En Desktop (md+): Tres columnas completas (PropertyManager, Viewport3D, MathReportPanel)
          - En Móvil (<md): Modos optimizados priorizando 3D + Sliders:
              * split: 3D arriba (~40vh) y Sliders abajo para interactuar y ver en vivo
              * 3d: Visor 3D a pantalla completa para inspección inmersiva
              * math: Reporte de cálculos matemáticos completo
      */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Panel Izquierdo: PropertyManager (Sliders y Actuadores) */}
        <PropertyManager
          theme={theme}
          theta1Deg={theta1Deg}
          setTheta1Deg={setTheta1Deg}
          theta2Deg={theta2Deg}
          setTheta2Deg={setTheta2Deg}
          theta3Deg={theta3Deg}
          setTheta3Deg={setTheta3Deg}
          gripperAperture={gripperAperture}
          setGripperAperture={setGripperAperture}
          l1={l1}
          setL1={setL1}
          l2={l2}
          setL2={setL2}
          telemetry={telemetry}
          onPosePreset={handlePosePreset}
          mobileTab={mobileTab}
          routineStatus={pickAndPlace.routineStatus}
          currentStepIndex={pickAndPlace.currentStepIndex}
          totalSteps={pickAndPlace.totalSteps}
          statusMessage={pickAndPlace.statusMessage}
          cubeLocation={pickAndPlace.cubeLocation}
          onStartRoutine={() =>
            pickAndPlace.startRoutine({
              theta1Deg,
              theta2Deg,
              theta3Deg,
              gripperAperture,
            })
          }
          onStopRoutine={pickAndPlace.stopRoutine}
          onResetCube={pickAndPlace.resetCube}
        />

        {/* Visor Central Tridimensional Three.js */}
        <Viewport3D
          theme={theme}
          theta1Deg={theta1Deg}
          setTheta2Deg={setTheta2Deg}
          theta2Deg={theta2Deg}
          theta3Deg={theta3Deg}
          l1={l1}
          l2={l2}
          hBase={hBase}
          telemetry={telemetry}
          cameraViewTrigger={cameraViewTrigger}
          onSetCameraView={handleSetCameraView}
          mobileTab={mobileTab}
          gripperAperture={gripperAperture}
          cubeLocation={pickAndPlace.cubeLocation}
          routineStatus={pickAndPlace.routineStatus}
          statusMessage={pickAndPlace.statusMessage}
          currentStepIndex={pickAndPlace.currentStepIndex}
          totalSteps={pickAndPlace.totalSteps}
        />

        {/* Panel Derecho: Cálculos Matemáticos */}
        <MathReportPanel
          theme={theme}
          theta1Deg={theta1Deg}
          theta2Deg={theta2Deg}
          theta3Deg={theta3Deg}
          l1={l1}
          l2={l2}
          telemetry={telemetry}
          mobileTab={mobileTab}
        />
      </main>

      {/* Barra de Navegación Móvil Inferior estilo CAD (Solo visible en pantallas < md) */}
      <nav
        className={`md:hidden flex items-center justify-around border-t py-1.5 px-3 shrink-0 z-20 transition-colors select-none ${
          theme === 'dark' ? 'bg-[#182234] border-[#334155]' : 'bg-[#ffffff] border-[#cbd5e1]'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileTab('split')}
          className={`flex-1 flex flex-col items-center py-1 px-1 rounded-lg transition-all active:scale-95 ${
            mobileTab === 'split'
              ? theme === 'dark'
                ? 'bg-[#2563eb]/20 text-[#60a5fa] font-semibold border border-[#2563eb]/40 shadow-sm'
                : 'bg-[#2563eb]/10 text-[#1d4ed8] font-semibold border border-[#2563eb]/30 shadow-sm'
              : theme === 'dark'
              ? 'text-[#94a3b8] hover:text-[#f8fafc]'
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Sliders className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] leading-tight font-medium">3D + Sliders</span>
          <span className="text-[9px] opacity-70 leading-tight">Control en Vivo</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('3d')}
          className={`flex-1 flex flex-col items-center py-1 px-1 rounded-lg transition-all active:scale-95 ${
            mobileTab === '3d'
              ? theme === 'dark'
                ? 'bg-[#2563eb]/20 text-[#60a5fa] font-semibold border border-[#2563eb]/40 shadow-sm'
                : 'bg-[#2563eb]/10 text-[#1d4ed8] font-semibold border border-[#2563eb]/30 shadow-sm'
              : theme === 'dark'
              ? 'text-[#94a3b8] hover:text-[#f8fafc]'
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Box className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] leading-tight font-medium">Solo 3D</span>
          <span className="text-[9px] opacity-70 leading-tight">Inspección</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('math')}
          className={`flex-1 flex flex-col items-center py-1 px-1 rounded-lg transition-all active:scale-95 ${
            mobileTab === 'math'
              ? theme === 'dark'
                ? 'bg-[#2563eb]/20 text-[#60a5fa] font-semibold border border-[#2563eb]/40 shadow-sm'
                : 'bg-[#2563eb]/10 text-[#1d4ed8] font-semibold border border-[#2563eb]/30 shadow-sm'
              : theme === 'dark'
              ? 'text-[#94a3b8] hover:text-[#f8fafc]'
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <Calculator className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] leading-tight font-medium">Matemáticas</span>
          <span className="text-[9px] opacity-70 leading-tight">Cinemática</span>
        </button>
      </nav>
    </div>
  );
}

