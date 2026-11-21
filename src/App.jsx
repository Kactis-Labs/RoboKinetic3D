import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Sliders, Box, Calculator } from 'lucide-react';
import Header from './components/Header';
import PropertyManager from './components/PropertyManager';
import Viewport3D from './components/Viewport3D';
import MathReportPanel from './components/MathReportPanel';
import {
  PHYSICAL_LIMITS,
  calculateShoulderTorque,
  clampPoseToWorkspace,
  getKinematicsTelemetry,
  inverseKinematics3DOF,
} from './kinematics';
import { usePickAndPlace } from './hooks/usePickAndPlace';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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

  // 4. Parámetros estructurales de eslabones y masa de carga
  const [l1, setL1] = useState(1.75); // Eslabón 1 (Brazo - 1.75m)
  const [l2, setL2] = useState(1.45); // Eslabón 2 (Antebrazo - 1.45m)
  const [payloadMass, setPayloadMass] = useState(PHYSICAL_LIMITS.defaultMassKg);
  const hBase = 0.60; // Altura del pedestal de la base al eje del hombro (0.60m)

  // 4.5. Alertas discretas de seguridad física y control cartesiano
  const [safetyAlert, setSafetyAlert] = useState(null);
  const [isCartesianMoving, setIsCartesianMoving] = useState(false);
  const cartesianAnimRef = useRef(null);

  useEffect(() => {
    if (!safetyAlert || safetyAlert.type === 'overload') return;
    const timer = setTimeout(() => {
      setSafetyAlert(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [safetyAlert]);

  useEffect(() => {
    return () => {
      if (cartesianAnimRef.current) {
        cancelAnimationFrame(cartesianAnimRef.current);
      }
    };
  }, []);

  const cancelCartesianMove = useCallback(() => {
    if (cartesianAnimRef.current) {
      cancelAnimationFrame(cartesianAnimRef.current);
      cartesianAnimRef.current = null;
    }
    setIsCartesianMoving(false);
  }, []);

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

  // Validación y acotación segura de articulaciones (Joint Clamping + Mesa + Pedestal)
  const applySafeJointPose = useCallback(
    ({
      nextT1 = theta1Deg,
      nextT2 = theta2Deg,
      nextT3 = theta3Deg,
      nextL1 = l1,
      nextL2 = l2,
    }) => {
      const clampedPose = clampPoseToWorkspace(
        {
          theta1Deg: nextT1,
          theta2Deg: nextT2,
          theta3Deg: nextT3,
          l1: nextL1,
          l2: nextL2,
          hBase,
        },
        { theta2Deg, theta3Deg }
      );

      setTheta1Deg(Number(clampedPose.theta1Deg.toFixed(2)));
      setTheta2Deg(Number(clampedPose.theta2Deg.toFixed(2)));
      setTheta3Deg(Number(clampedPose.theta3Deg.toFixed(2)));

      if (clampedPose.clamped && clampedPose.message) {
        setSafetyAlert({
          type: 'warning',
          message: clampedPose.message,
          timestamp: Date.now(),
        });
      }
    },
    [theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase]
  );

  const handleSafeTheta1Change = useCallback(
    (val) => {
      cancelCartesianMove();
      applySafeJointPose({ nextT1: val });
    },
    [cancelCartesianMove, applySafeJointPose]
  );

  const handleSafeTheta2Change = useCallback(
    (val) => {
      cancelCartesianMove();
      applySafeJointPose({ nextT2: val });
    },
    [cancelCartesianMove, applySafeJointPose]
  );

  const handleSafeTheta3Change = useCallback(
    (val) => {
      cancelCartesianMove();
      applySafeJointPose({ nextT3: val });
    },
    [cancelCartesianMove, applySafeJointPose]
  );

  const handleSafeL1Change = useCallback(
    (val) => {
      cancelCartesianMove();
      const safeL1 = Math.max(1.2, Math.min(2.4, val));
      setL1(safeL1);
      applySafeJointPose({ nextL1: safeL1 });
    },
    [cancelCartesianMove, applySafeJointPose]
  );

  const handleSafeL2Change = useCallback(
    (val) => {
      cancelCartesianMove();
      const safeL2 = Math.max(1.0, Math.min(2.0, val));
      setL2(safeL2);
      applySafeJointPose({ nextL2: safeL2 });
    },
    [cancelCartesianMove, applySafeJointPose]
  );

  // Interpolación suave Ease-In-Out hacia coordenada cartesiana (X, Y, Z) validada
  const handleMoveToCartesian = useCallback(
    ({ x, y, z }) => {
      if (pickAndPlace.routineStatus === 'RUNNING') {
        const msg = 'Detén la rutina Pick & Place antes de mover por coordenadas.';
        setSafetyAlert({ type: 'warning', message: msg, timestamp: Date.now() });
        return { ok: false, message: msg };
      }

      const ik = inverseKinematics3DOF({
        targetX: x,
        targetY: y,
        targetZ: z,
        l1,
        l2,
        hBase,
        elbowConfig: 'up',
        currentTheta1Deg: theta1Deg,
      });

      if (!ik.isValid) {
        const msg = ik.errorMessage || 'Punto fuera de alcance / Colisión con mesa';
        setSafetyAlert({
          type: 'error',
          message: msg,
          timestamp: Date.now(),
        });
        return { ok: false, message: msg };
      }

      cancelCartesianMove();

      const destTorque = calculateShoulderTorque({
        rHorizontal: ik.r,
        payloadMassKg: payloadMass,
        l1,
        l2,
        theta2Deg: ik.theta2Deg,
        theta3Deg: ik.theta3Deg,
        isGripped: pickAndPlace.cubeLocation === 'gripped',
      });
      if (destTorque.isOverloaded) {
        setSafetyAlert({
          type: 'overload',
          message: `Sobrecarga proyectada en Servo Hombro (J2): ${destTorque.torqueNm.toFixed(1)} N·m`,
          timestamp: Date.now(),
        });
      } else {
        setSafetyAlert(null);
      }

      setIsCartesianMoving(true);

      const startT1 = theta1Deg;
      const startT2 = theta2Deg;
      const startT3 = theta3Deg;
      const targetT1 = ik.theta1Deg;
      const targetT2 = ik.theta2Deg;
      const targetT3 = ik.theta3Deg;
      const durationMs = 900;
      const startTime = performance.now();

      const animateMove = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / durationMs));
        const ease = easeInOutCubic(progress);

        const rawT1 = startT1 + (targetT1 - startT1) * ease;
        const rawT2 = startT2 + (targetT2 - startT2) * ease;
        const rawT3 = startT3 + (targetT3 - startT3) * ease;

        const safeStep = clampPoseToWorkspace(
          { theta1Deg: rawT1, theta2Deg: rawT2, theta3Deg: rawT3, l1, l2, hBase },
          { theta2Deg: targetT2, theta3Deg: targetT3 },
          { useAbsoluteJointLimits: true }
        );

        setTheta1Deg(Number(safeStep.theta1Deg.toFixed(2)));
        setTheta2Deg(Number(safeStep.theta2Deg.toFixed(2)));
        setTheta3Deg(Number(safeStep.theta3Deg.toFixed(2)));

        if (progress < 1) {
          cartesianAnimRef.current = requestAnimationFrame(animateMove);
        } else {
          setTheta1Deg(Number(targetT1.toFixed(2)));
          setTheta2Deg(Number(targetT2.toFixed(2)));
          setTheta3Deg(Number(targetT3.toFixed(2)));
          cartesianAnimRef.current = null;
          setIsCartesianMoving(false);
        }
      };

      cartesianAnimRef.current = requestAnimationFrame(animateMove);
      return { ok: true };
    },
    [pickAndPlace.routineStatus, l1, l2, hBase, theta1Deg, theta2Deg, theta3Deg, cancelCartesianMove]
  );

  // 7. Cálculo matemático cinemático y torque realista en tiempo real
  const isCubeGripped = pickAndPlace.cubeLocation === 'gripped';
  const telemetry = useMemo(() => {
    return getKinematicsTelemetry({
      theta1Deg,
      theta2Deg,
      theta3Deg,
      l1,
      l2,
      hBase,
      payloadMassKg: payloadMass,
      isGripped: isCubeGripped,
    });
  }, [theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase, payloadMass, isCubeGripped]);

  // Alerta automática por transición hacia sobrecarga del servomotor J2
  const prevOverloadRef = useRef(false);
  useEffect(() => {
    const overloaded = Boolean(telemetry.torque?.isOverloaded);
    if (overloaded && !prevOverloadRef.current) {
      setSafetyAlert({
        type: 'overload',
        message: `Sobrecarga en Servo Hombro (J2): ${telemetry.torque.torqueNm.toFixed(1)} N·m — reduce alcance o carga`,
        timestamp: Date.now(),
      });
    } else if (!overloaded && prevOverloadRef.current) {
      setSafetyAlert((prev) => (prev?.type === 'overload' ? null : prev));
    }
    prevOverloadRef.current = overloaded;
  }, [telemetry.torque?.isOverloaded, telemetry.torque?.torqueNm]);

  // Restablecer parámetros a valores de fábrica (Home industrial)
  const handleReset = () => {
    cancelCartesianMove();
    pickAndPlace.resetCube();
    setTheta1Deg(0.0);
    setTheta2Deg(100.0);
    setTheta3Deg(-120.0);
    setGripperAperture(14.0);
    setL1(1.75);
    setL2(1.45);
    setPayloadMass(PHYSICAL_LIMITS.defaultMassKg);
    setSafetyAlert(null);
    handleSetCameraView('isometric');
  };

  // Ajustar postura predeterminada del robot
  const handlePosePreset = ({ t1, t2, t3, grip }) => {
    cancelCartesianMove();
    applySafeJointPose({
      nextT1: t1 !== undefined ? t1 : theta1Deg,
      nextT2: t2 !== undefined ? t2 : theta2Deg,
      nextT3: t3 !== undefined ? t3 : theta3Deg,
    });
    if (grip !== undefined) setGripperAperture(grip);
  };

  return (
    <div
      className={`h-screen h-[100dvh] w-screen flex flex-col overflow-hidden theme-${theme} ${
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

      {/* Área de trabajo CAD */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* Panel Izquierdo: PropertyManager (Sliders, Actuadores, Cartesiano y Torque) */}
        <PropertyManager
          theme={theme}
          theta1Deg={theta1Deg}
          setTheta1Deg={handleSafeTheta1Change}
          theta2Deg={theta2Deg}
          setTheta2Deg={handleSafeTheta2Change}
          theta3Deg={theta3Deg}
          setTheta3Deg={handleSafeTheta3Change}
          gripperAperture={gripperAperture}
          setGripperAperture={setGripperAperture}
          l1={l1}
          setL1={handleSafeL1Change}
          l2={l2}
          setL2={handleSafeL2Change}
          payloadMass={payloadMass}
          setPayloadMass={setPayloadMass}
          telemetry={telemetry}
          onPosePreset={handlePosePreset}
          onMoveToCartesian={handleMoveToCartesian}
          isCartesianMoving={isCartesianMoving}
          safetyAlert={safetyAlert}
          mobileTab={mobileTab}
          routineStatus={pickAndPlace.routineStatus}
          currentStepIndex={pickAndPlace.currentStepIndex}
          totalSteps={pickAndPlace.totalSteps}
          statusMessage={pickAndPlace.statusMessage}
          cubeLocation={pickAndPlace.cubeLocation}
          onStartRoutine={() => {
            cancelCartesianMove();
            pickAndPlace.startRoutine({
              theta1Deg,
              theta2Deg,
              theta3Deg,
              gripperAperture,
            });
          }}
          onStopRoutine={pickAndPlace.stopRoutine}
          onResetCube={pickAndPlace.resetCube}
        />

        {/* Visor Central Tridimensional Three.js */}
        <Viewport3D
          theme={theme}
          theta1Deg={theta1Deg}
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
          safetyAlert={safetyAlert}
          onDismissSafetyAlert={() => setSafetyAlert(null)}
        />

        {/* Panel Derecho: Cálculos Matemáticos */}
        <MathReportPanel
          theme={theme}
          theta1Deg={theta1Deg}
          theta2Deg={theta2Deg}
          theta3Deg={theta3Deg}
          l1={l1}
          l2={l2}
          payloadMass={payloadMass}
          setPayloadMass={setPayloadMass}
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
