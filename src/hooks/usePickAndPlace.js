import { useState, useRef, useEffect, useCallback } from 'react';
import { inverseKinematics3DOF } from '../kinematics';

/**
 * Coordenadas espaciales estándar del entorno de trabajo (Proporción Armónica con la Base del Robot)
 */
export const PICK_ZONE = {
  name: 'Pick Zone',
  x: 1.45,
  y: 1.55,
  zGround: 0.02,
  zApproach: 0.75,
  zGrip: 0.18, // Altura exacta del centro geométrico del cubo sobre el pedestal (0.32/2 + 0.02)
  color: '#d97706', // Ámbar industrial
};

export const PLACE_ZONE = {
  name: 'Place Zone',
  x: 1.45,
  y: -1.55,
  zGround: 0.02,
  zApproach: 0.75,
  zPlace: 0.18,
  color: '#2563eb', // Azul industrial
};

export const HOME_POSE = {
  theta1: 0,
  theta2: 100,
  theta3: -120,
  gripper: 14, // mm (apertura neutra relajada en posición inicial Home)
};

/**
 * Función de aceleración suave (Smoothstep / Cubic Ease-In-Out)
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Hook para la orquestación y cinemática en tiempo real de la Rutina Pick & Place
 */
export function usePickAndPlace({
  setTheta1Deg,
  setTheta2Deg,
  setTheta3Deg,
  setGripperAperture,
  l1 = 1.75,
  l2 = 1.45,
  hBase = 0.60,
}) {
  // Estado actual de la máquina de estados
  const [routineStatus, setRoutineStatus] = useState('IDLE'); // IDLE, RUNNING, PAUSED, COMPLETED
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Listo para iniciar rutina');
  const [cubeLocation, setCubeLocation] = useState('pick'); // 'pick', 'gripped', 'place'

  const animFrameRef = useRef(null);
  const isRunningRef = useRef(false);

  // Detener cualquier animación al desmontar
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  /**
   * Resuelve los ángulos articulares para un punto objetivo (X, Y, Z)
   * alcanzando directamente el centro TCP del efector final.
   */
  const resolveTargetPose = useCallback(
    (targetX, targetY, targetZ) => {
      return inverseKinematics3DOF({
        targetX,
        targetY,
        targetZ,
        l1,
        l2,
        hBase,
        elbowConfig: 'down',
      });
    },
    [l1, l2, hBase]
  );

  /**
   * Genera los waypoints discretos de la trayectoria
   */
  const buildTrajectory = useCallback(() => {
    const ikPickHigh = resolveTargetPose(PICK_ZONE.x, PICK_ZONE.y, PICK_ZONE.zApproach);
    const ikPickLow = resolveTargetPose(PICK_ZONE.x, PICK_ZONE.y, PICK_ZONE.zGrip);
    const ikPlaceHigh = resolveTargetPose(PLACE_ZONE.x, PLACE_ZONE.y, PLACE_ZONE.zApproach);
    const ikPlaceLow = resolveTargetPose(PLACE_ZONE.x, PLACE_ZONE.y, PLACE_ZONE.zPlace);

    return [
      // 0. Traslado aéreo hacia la Zona Pick en altura de seguridad (pinza en reposo neutro de 14 mm)
      {
        id: 'APPROACH_PICK_HIGH',
        name: 'Trasladándose sobre Zona Pick',
        durationMs: 1500,
        t1: ikPickHigh.theta1Deg,
        t2: ikPickHigh.theta2Deg,
        t3: ikPickHigh.theta3Deg,
        gripper: 14,
        cubeLoc: 'pick',
      },
      // 1. Justo antes de bajar: apertura amplia de la pinza sobre el cubo
      {
        id: 'OPEN_BEFORE_DESCEND',
        name: 'Abriendo Pinza sobre el Cubo',
        durationMs: 700,
        t1: ikPickHigh.theta1Deg,
        t2: ikPickHigh.theta2Deg,
        t3: ikPickHigh.theta3Deg,
        gripper: 38,
        cubeLoc: 'pick',
      },
      // 2. Descenso vertical sobre el cubo con la pinza abierta
      {
        id: 'DESCEND_PICK',
        name: 'Descendiendo hacia el Cubo (Pinza Abierta)',
        durationMs: 1200,
        t1: ikPickLow.theta1Deg,
        t2: ikPickLow.theta2Deg,
        t3: ikPickLow.theta3Deg,
        gripper: 38,
        cubeLoc: 'pick',
      },
      // 3. Sujeción física: Cierre de mordazas hasta tocar las caras del cubo (29 mm)
      {
        id: 'GRIP_CLOSE',
        name: 'Sujetando Pieza (Cierre de Contacto)',
        durationMs: 800,
        t1: ikPickLow.theta1Deg,
        t2: ikPickLow.theta2Deg,
        t3: ikPickLow.theta3Deg,
        gripper: 29,
        cubeLocOnEnd: 'gripped',
      },
      // 4. Elevación vertical de despeje con el cubo sujeto
      {
        id: 'LIFT_CLEARANCE',
        name: 'Elevando Pieza (Despeje vertical)',
        durationMs: 1100,
        t1: ikPickHigh.theta1Deg,
        t2: ikPickHigh.theta2Deg,
        t3: ikPickHigh.theta3Deg,
        gripper: 29,
        cubeLoc: 'gripped',
      },
      // 5. Transporte aéreo hacia la Zona Place manteniendo el cubo sujeto
      {
        id: 'TRAVERSE_PLACE',
        name: 'Transportando a Zona Place',
        durationMs: 1700,
        t1: ikPlaceHigh.theta1Deg,
        t2: ikPlaceHigh.theta2Deg,
        t3: ikPlaceHigh.theta3Deg,
        gripper: 29,
        cubeLoc: 'gripped',
      },
      // 6. Descenso suave de la caja en la plataforma de Zona Place
      {
        id: 'DESCEND_PLACE',
        name: 'Bajando la Caja en Zona Place',
        durationMs: 1200,
        t1: ikPlaceLow.theta1Deg,
        t2: ikPlaceLow.theta2Deg,
        t3: ikPlaceLow.theta3Deg,
        gripper: 29,
        cubeLoc: 'gripped',
      },
      // 7. Liberación: Apertura de pinza sobre la plataforma
      {
        id: 'RELEASE_OPEN',
        name: 'Abriendo Pinza / Soltando Pieza',
        durationMs: 800,
        t1: ikPlaceLow.theta1Deg,
        t2: ikPlaceLow.theta2Deg,
        t3: ikPlaceLow.theta3Deg,
        gripper: 38,
        cubeLoc: 'place',
      },
      // 8. Ascenso vertical dejando la caja depositada
      {
        id: 'LIFT_POST_RELEASE',
        name: 'Subiendo Efector Final (Despeje)',
        durationMs: 1100,
        t1: ikPlaceHigh.theta1Deg,
        t2: ikPlaceHigh.theta2Deg,
        t3: ikPlaceHigh.theta3Deg,
        gripper: 38,
        cubeLoc: 'place',
      },
      // 9. Retorno a la posición inicial (Home) con la pinza en estado neutro relajado (14 mm)
      {
        id: 'RETURN_HOME',
        name: 'Retornando a Posición Inicial (Pinza Neutra)',
        durationMs: 1500,
        t1: HOME_POSE.theta1,
        t2: HOME_POSE.theta2,
        t3: HOME_POSE.theta3,
        gripper: 14,
        cubeLoc: 'place',
      },
    ];
  }, [resolveTargetPose]);

  /**
   * Ejecuta la rutina paso a paso con interpolación suave en 60 FPS
   */
  const startRoutine = useCallback(
    (startValues) => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      setRoutineStatus('RUNNING');

      const waypoints = buildTrajectory();
      let stepIndex = 0;

      // Estado inicial dinámico basado en la postura actual del robot
      let startState = {
        t1: startValues.theta1Deg,
        t2: startValues.theta2Deg,
        t3: startValues.theta3Deg,
        gripper: startValues.gripperAperture ?? 14,
      };

      const executeStep = () => {
        if (!isRunningRef.current) return;

        if (stepIndex >= waypoints.length) {
          // Rutina finalizada con éxito
          isRunningRef.current = false;
          setRoutineStatus('COMPLETED');
          setStatusMessage('Rutina Pick & Place Completada');
          return;
        }

        const target = waypoints[stepIndex];
        setCurrentStepIndex(stepIndex);
        setStatusMessage(target.name);
        if (target.cubeLoc) {
          setCubeLocation(target.cubeLoc);
        }

        const startTime = performance.now();
        const duration = target.durationMs;

        const animateInterpolation = (now) => {
          if (!isRunningRef.current) return;

          const elapsed = now - startTime;
          const progress = Math.min(1, Math.max(0, elapsed / duration));
          const ease = easeInOutCubic(progress);

          // Interpolación suave de articulaciones
          const curT1 = startState.t1 + (target.t1 - startState.t1) * ease;
          const curT2 = startState.t2 + (target.t2 - startState.t2) * ease;
          const curT3 = startState.t3 + (target.t3 - startState.t3) * ease;
          const curGrip = startState.gripper + (target.gripper - startState.gripper) * ease;

          setTheta1Deg(parseFloat(curT1.toFixed(2)));
          setTheta2Deg(parseFloat(curT2.toFixed(2)));
          setTheta3Deg(parseFloat(curT3.toFixed(2)));
          setGripperAperture(parseFloat(curGrip.toFixed(1)));

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animateInterpolation);
          } else {
            // Fin del paso actual: si define cambio de estado al completar, aplicarlo aquí
            if (target.cubeLocOnEnd) {
              setCubeLocation(target.cubeLocOnEnd);
            }

            // Actualizar inicio para el siguiente paso
            startState = {
              t1: target.t1,
              t2: target.t2,
              t3: target.t3,
              gripper: target.gripper,
            };
            stepIndex++;
            // Breve pausa para estabilidad antes del siguiente paso
            setTimeout(() => {
              if (isRunningRef.current) {
                animFrameRef.current = requestAnimationFrame(executeStep);
              }
            }, 60);
          }
        };

        animFrameRef.current = requestAnimationFrame(animateInterpolation);
      };

      animFrameRef.current = requestAnimationFrame(executeStep);
    },
    [buildTrajectory, setTheta1Deg, setTheta2Deg, setTheta3Deg, setGripperAperture]
  );

  /**
   * Detener la rutina en cualquier momento
   */
  const stopRoutine = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setRoutineStatus('IDLE');
    setStatusMessage('Rutina detenida');
  }, []);

  /**
   * Reiniciar el cubo métrico a la Zona Pick
   */
  const resetCube = useCallback(() => {
    stopRoutine();
    setCubeLocation('pick');
    setStatusMessage('Cubo reposicionado en Zona Pick');
  }, [stopRoutine]);

  return {
    routineStatus,
    currentStepIndex,
    totalSteps: 10,
    statusMessage,
    cubeLocation,
    startRoutine,
    stopRoutine,
    resetCube,
    setCubeLocation,
  };
}

