/**
 * @file kinematics.js
 * Módulo de Fundamentos Cinemáticos para RoboKinetic 3D.
 * 
 * Este módulo contiene el motor matemático para el brazo robótico articulado (3 DOF):
 * 1. Articulación Base (J1): Servomotor de rotación en el plano horizontal (Yaw / Azimuth, θ₁).
 * 2. Articulación Hombro (J2): Servomotor de elevación/inclinación en el plano vertical (Pitch, θ₂).
 * 3. Articulación Codo (J3): Servomotor de flexión/extensión del antebrazo (Pitch relativo, θ₃).
 * 
 * Modos de representación:
 * - Coordenadas Articulares (θ₁, θ₂, θ₃): Ángulos de los servomotores.
 * - Coordenadas Cilíndricas (r_xy, θ₁, Z): Radio horizontal, azimuth y altura.
 * - Coordenadas Cartesianas (X, Y, Z): Posición tridimensional del efector final (TCP) en la mesa de trabajo.
 * - Coordenadas Esféricas (ρ, θ₁, φ): Distancia tridimensional y ángulos de elevación.
 */

/**
 * Constantes físicas, geométricas y de seguridad de la celda robótica.
 * Coherentes con la geometría Three.js en Viewport3D.jsx:
 * - Mesa de trabajo en Z = 0 (Y = 0 en Three.js)
 * - Pedestal central: radio inferior 0.88 m, altura de exclusión hasta la torreta/disco 0.75 m
 * - Eje del hombro (J2): hBase = 0.60 m
 */
export const PHYSICAL_LIMITS = {
  theta1: { min: -180, max: 180 },
  theta2: { min: -20, max: 100 },
  theta3: { min: -120, max: 60 },
  absoluteTheta2: { min: -20, max: 145 },
  absoluteTheta3: { min: -150, max: 60 },
  minTableZ: 0.12,        // Altura mínima segura del TCP/codo sobre la mesa (m)
  pedestalRadius: 0.88,   // Radio exterior del pedestal central (m)
  pedestalHeight: 0.75,   // Altura de exclusión del cilindro del pedestal/torreta (m)
  gravity: 9.81,          // Aceleración de la gravedad (m/s²)
  defaultMassKg: 2.0,     // Masa de carga del cubo por defecto (kg)
  minMassKg: 0.5,
  maxMassKg: 10.0,
  gripperMassKg: 0.30,    // Masa propia de la pinza vacía (kg)
  link1DensityKgPerM: 1.4,// Densidad lineal del brazo L₁ (kg/m)
  link2DensityKgPerM: 0.9,// Densidad lineal del antebrazo L₂ (kg/m)
  safeTorqueLimitNm: 180, // Torque máximo nominal de referencia para sobrecarga (N·m)
};

/**
 * Convierte un ángulo de grados sexagesimales a radianes.
 * @param {number} degrees - Ángulo en grados
 * @returns {number} Ángulo en radianes
 */
export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Convierte un ángulo de radianes a grados sexagesimales.
 * @param {number} radians - Ángulo en radianes
 * @returns {number} Ángulo en grados
 */
export function radToDeg(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Limpia números infinitesimales generados por la imprecisión de punto flotante.
 * @param {number} val 
 * @returns {number}
 */
function cleanZero(val) {
  return Math.abs(val) < 1e-10 ? 0 : val;
}

function clampVal(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Acota los ángulos articulares (θ₁, θ₂, θ₃) a sus rangos físicos seguros.
 * @param {object} params
 * @param {number} params.theta1Deg
 * @param {number} params.theta2Deg
 * @param {number} params.theta3Deg
 * @param {boolean} [params.useAbsoluteJointLimits=false]
 * @returns {{ theta1Deg: number, theta2Deg: number, theta3Deg: number, wasJointClamped: boolean, jointClampMessage: string|null }}
 */
export function clampJointAngles({
  theta1Deg = 0,
  theta2Deg = 35,
  theta3Deg = -25,
  useAbsoluteJointLimits = false,
}) {
  const t2Bounds = useAbsoluteJointLimits ? PHYSICAL_LIMITS.absoluteTheta2 : PHYSICAL_LIMITS.theta2;
  const t3Bounds = useAbsoluteJointLimits ? PHYSICAL_LIMITS.absoluteTheta3 : PHYSICAL_LIMITS.theta3;

  const safeT1 = Number.isFinite(theta1Deg) ? clampVal(theta1Deg, PHYSICAL_LIMITS.theta1.min, PHYSICAL_LIMITS.theta1.max) : 0;
  const safeT2 = Number.isFinite(theta2Deg) ? clampVal(theta2Deg, t2Bounds.min, t2Bounds.max) : 35;
  const safeT3 = Number.isFinite(theta3Deg) ? clampVal(theta3Deg, t3Bounds.min, t3Bounds.max) : -25;

  const t1Clamped = Math.abs(safeT1 - theta1Deg) > 1e-6;
  const t2Clamped = Math.abs(safeT2 - theta2Deg) > 1e-6;
  const t3Clamped = Math.abs(safeT3 - theta3Deg) > 1e-6;
  const wasJointClamped = t1Clamped || t2Clamped || t3Clamped;

  let jointClampMessage = null;
  if (wasJointClamped) {
    const joints = [];
    if (t1Clamped) joints.push(`J1 [${PHYSICAL_LIMITS.theta1.min}°, ${PHYSICAL_LIMITS.theta1.max}°]`);
    if (t2Clamped) joints.push(`J2 [${t2Bounds.min}°, ${t2Bounds.max}°]`);
    if (t3Clamped) joints.push(`J3 [${t3Bounds.min}°, ${t3Bounds.max}°]`);
    jointClampMessage = `Límite articular alcanzado (${joints.join(', ')}). Movimiento acotado por seguridad.`;
  }

  return {
    theta1Deg: safeT1,
    theta2Deg: safeT2,
    theta3Deg: safeT3,
    wasJointClamped,
    jointClampMessage,
  };
}

/**
 * Calcula la cinemática directa sin acotación geométrica (uso interno para evaluación de colisiones).
 */
function computeRawFK({
  theta1Deg = 45,
  theta2Deg = 35,
  theta3Deg = -25,
  l1 = 1.75,
  l2 = 1.45,
  hBase = 0.60,
}) {
  const t1Rad = degToRad(theta1Deg);
  const t2Rad = degToRad(theta2Deg);
  const t3Rad = degToRad(theta3Deg);
  const t23Rad = t2Rad + t3Rad;

  const rElbow = l1 * Math.cos(t2Rad);
  const zElbow = hBase + l1 * Math.sin(t2Rad);

  const rTcp = rElbow + l2 * Math.cos(t23Rad);
  const zTcp = zElbow + l2 * Math.sin(t23Rad);

  const elbowX = rElbow * Math.cos(t1Rad);
  const elbowY = rElbow * Math.sin(t1Rad);
  const elbowZ = zElbow;

  const tcpX = rTcp * Math.cos(t1Rad);
  const tcpY = rTcp * Math.sin(t1Rad);
  const tcpZ = zTcp;

  const deltaZ = tcpZ - hBase;
  const rhoFromShoulder = Math.hypot(rTcp, deltaZ);
  const elevationAngleRad = Math.atan2(deltaZ, rTcp);
  const elevationAngleDeg = radToDeg(elevationAngleRad);
  const rhoFromOrigin = Math.hypot(tcpX, tcpY, tcpZ);

  return {
    angles: {
      t1Deg: theta1Deg,
      t1Rad,
      t2Deg: theta2Deg,
      t2Rad,
      t3Deg: theta3Deg,
      t3Rad,
      t23Rad,
      t23Deg: radToDeg(t23Rad),
    },
    lengths: {
      l1,
      l2,
      hBase,
      totalReach: l1 + l2,
    },
    elbow: {
      r: cleanZero(rElbow),
      x: cleanZero(elbowX),
      y: cleanZero(elbowY),
      z: cleanZero(elbowZ),
    },
    tcp: {
      rGround: cleanZero(rTcp),
      x: cleanZero(tcpX),
      y: cleanZero(tcpY),
      z: cleanZero(tcpZ),
      deltaZ: cleanZero(deltaZ),
      rhoShoulder: cleanZero(rhoFromShoulder),
      rhoOrigin: cleanZero(rhoFromOrigin),
      elevationAngleDeg: cleanZero(elevationAngleDeg),
    },
  };
}

/**
 * Evalúa si una postura FK invade la mesa de trabajo o el cilindro del pedestal central.
 * @param {object} rawFk - Resultado de computeRawFK
 * @returns {{ hasCollision: boolean, collisionType: null|'table'|'pedestal', message: string|null }}
 */
export function evaluateWorkspaceCollision(rawFk) {
  const EPS = 1e-6;
  const rTcp = rawFk.tcp.rGround;
  const zTcp = rawFk.tcp.z;
  const zElbow = rawFk.elbow.z;

  const invadesTable =
    zTcp < PHYSICAL_LIMITS.minTableZ - EPS || zElbow < PHYSICAL_LIMITS.minTableZ - EPS;

  const invadesPedestalCylinder =
    Math.abs(rTcp) < PHYSICAL_LIMITS.pedestalRadius - EPS &&
    zTcp < PHYSICAL_LIMITS.pedestalHeight - EPS;

  const backfoldsPastAxis = rTcp < -1e-4;

  if (invadesPedestalCylinder || backfoldsPastAxis) {
    return {
      hasCollision: true,
      collisionType: 'pedestal',
      message: backfoldsPastAxis
        ? 'Autocolisión detectada: el antebrazo cruza el eje central sobre la torreta. Movimiento acotado.'
        : `Frontera de pedestal detectada (r < ${PHYSICAL_LIMITS.pedestalRadius} m, Z < ${PHYSICAL_LIMITS.pedestalHeight} m). Movimiento acotado.`,
    };
  }

  if (invadesTable) {
    return {
      hasCollision: true,
      collisionType: 'table',
      message: `Frontera de mesa detectada (altura mínima Z ≥ ${PHYSICAL_LIMITS.minTableZ} m). Movimiento acotado.`,
    };
  }

  return {
    hasCollision: false,
    collisionType: null,
    message: null,
  };
}

/**
 * Valida y acota una postura articular a los rangos seguros de articulación, mesa y pedestal.
 * Si hay colisión geométrica, busca por bisección el límite seguro hacia la postura de respaldo.
 *
 * @param {object} pose
 * @param {object} [fallbackSafeAngles]
 * @param {object} [options]
 * @returns {{ theta1Deg: number, theta2Deg: number, theta3Deg: number, clamped: boolean, collisionType: null|'table'|'pedestal'|'joint', message: string|null }}
 */
export function clampPoseToWorkspace(
  {
    theta1Deg = 0,
    theta2Deg = 35,
    theta3Deg = -25,
    l1 = 1.75,
    l2 = 1.45,
    hBase = 0.60,
  },
  fallbackSafeAngles = { theta2Deg: 65, theta3Deg: -65 },
  options = {}
) {
  const { useAbsoluteJointLimits = false } = options;

  const jointRes = clampJointAngles({
    theta1Deg,
    theta2Deg,
    theta3Deg,
    useAbsoluteJointLimits,
  });

  const rawFk = computeRawFK({
    theta1Deg: jointRes.theta1Deg,
    theta2Deg: jointRes.theta2Deg,
    theta3Deg: jointRes.theta3Deg,
    l1,
    l2,
    hBase,
  });

  const collision = evaluateWorkspaceCollision(rawFk);
  if (!collision.hasCollision) {
    return {
      theta1Deg: jointRes.theta1Deg,
      theta2Deg: jointRes.theta2Deg,
      theta3Deg: jointRes.theta3Deg,
      clamped: jointRes.wasJointClamped,
      collisionType: jointRes.wasJointClamped ? 'joint' : null,
      message: jointRes.jointClampMessage,
    };
  }

  // Asegurar que la postura de respaldo sea 100% libre de colisión
  const defaultGuaranteedSafe = { theta2Deg: 65, theta3Deg: -65 };
  const candidateSafe = clampJointAngles({
    theta1Deg: jointRes.theta1Deg,
    theta2Deg: fallbackSafeAngles?.theta2Deg ?? defaultGuaranteedSafe.theta2Deg,
    theta3Deg: fallbackSafeAngles?.theta3Deg ?? defaultGuaranteedSafe.theta3Deg,
    useAbsoluteJointLimits,
  });

  const candidateCollision = evaluateWorkspaceCollision(
    computeRawFK({
      theta1Deg: jointRes.theta1Deg,
      theta2Deg: candidateSafe.theta2Deg,
      theta3Deg: candidateSafe.theta3Deg,
      l1,
      l2,
      hBase,
    })
  );

  const safeTarget = candidateCollision.hasCollision ? defaultGuaranteedSafe : candidateSafe;

  // Bisección de 16 iteraciones entre la postura segura y la postura deseada para quedar en la frontera exacta
  let low = 0; // 0 => safeTarget
  let high = 1; // 1 => jointRes (en colisión)
  let bestT2 = safeTarget.theta2Deg;
  let bestT3 = safeTarget.theta3Deg;

  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    const testT2 = safeTarget.theta2Deg + (jointRes.theta2Deg - safeTarget.theta2Deg) * mid;
    const testT3 = safeTarget.theta3Deg + (jointRes.theta3Deg - safeTarget.theta3Deg) * mid;

    const testFk = computeRawFK({
      theta1Deg: jointRes.theta1Deg,
      theta2Deg: testT2,
      theta3Deg: testT3,
      l1,
      l2,
      hBase,
    });
    const testCol = evaluateWorkspaceCollision(testFk);
    if (!testCol.hasCollision) {
      low = mid;
      bestT2 = testT2;
      bestT3 = testT3;
    } else {
      high = mid;
    }
  }

  return {
    theta1Deg: Number(jointRes.theta1Deg.toFixed(4)),
    theta2Deg: Number(bestT2.toFixed(4)),
    theta3Deg: Number(bestT3.toFixed(4)),
    clamped: true,
    collisionType: collision.collisionType,
    message: collision.message,
  };
}

/**
 * CONVERSIÓN DIRECTA 2D BÁSICA (POLARES -> CARTESIANAS)
 * Mantenida por compatibilidad y para cálculos en el plano del suelo.
 * 
 * @param {number} r - Radio horizontal
 * @param {number} thetaRad - Ángulo en radianes
 * @returns {{ x: number, y: number }}
 */
export function polarToCartesian(r, thetaRad) {
  const x = r * Math.cos(thetaRad);
  const y = r * Math.sin(thetaRad);
  return {
    x: cleanZero(x),
    y: cleanZero(y),
  };
}

/**
 * CONVERSIÓN INVERSA 2D BÁSICA (CARTESIANAS -> POLARES)
 * 
 * @param {number} x - Posición en el eje X
 * @param {number} y - Posición en el eje Y
 * @returns {{ r: number, thetaRad: number, thetaDeg: number }}
 */
export function cartesianToPolar(x, y) {
  const r = Math.hypot(x, y);
  const thetaRad = Math.atan2(y, x);
  const thetaDeg = radToDeg(thetaRad);
  return {
    r: cleanZero(r),
    thetaRad: cleanZero(thetaRad),
    thetaDeg: cleanZero(thetaDeg),
  };
}

/**
 * CINEMÁTICA DIRECTA 3D (FORWARD KINEMATICS - 3 DOF)
 * Calcula la posición espacial exacta de cada articulación y del efector final,
 * validando límites físicos, mesa y pedestal.
 * 
 * Parámetros:
 * - theta1Deg: Giro de la Base (eje vertical Y en Three.js / plano X-Y de la mesa)
 * - theta2Deg: Inclinación del Hombro respecto a la horizontal
 * - theta3Deg: Flexión del Codo respecto al eslabón 1
 * - l1: Longitud del Eslabón 1 (Húmero / Brazo)
 * - l2: Longitud del Eslabón 2 (Cúbito-Radio / Antebrazo)
 * - hBase: Altura del pedestal de la base al eje del servomotor del hombro
 * - enforceLimits: Activa validación y acotación segura de frontera mesa/pedestal
 * 
 * @returns {object} Posiciones articulares (Codo, TCP, proyecciones, safety)
 */
export function forwardKinematics3DOF({
  theta1Deg = 45,
  theta2Deg = 35,
  theta3Deg = -25,
  l1 = 1.75,
  l2 = 1.45,
  hBase = 0.60,
  enforceLimits = true,
}) {
  if (!enforceLimits) {
    const raw = computeRawFK({ theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase });
    return {
      ...raw,
      safety: {
        clamped: false,
        collisionType: null,
        message: null,
      },
    };
  }

  const safePose = clampPoseToWorkspace(
    { theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase },
    { theta2Deg: 65, theta3Deg: -65 },
    { useAbsoluteJointLimits: true }
  );

  const fk = computeRawFK({
    theta1Deg: safePose.theta1Deg,
    theta2Deg: safePose.theta2Deg,
    theta3Deg: safePose.theta3Deg,
    l1,
    l2,
    hBase,
  });

  return {
    ...fk,
    safety: {
      clamped: safePose.clamped,
      collisionType: safePose.collisionType,
      message: safePose.message,
    },
  };
}

/**
 * CÁLCULO DE TORQUE ESTÁTICO REALISTA EN EL HOMBRO (J2)
 * Considera el peso propio de los eslabones (L₁, L₂ en sus centros de masa),
 * el peso de la pinza vacía y la masa del cubo solo cuando está sujeto (isGripped).
 *
 * @param {object} params
 * @param {number} params.rHorizontal - Brazo de palanca horizontal del TCP r (m)
 * @param {number} [params.payloadMassKg=2.0] - Masa configurada del cubo (kg)
 * @param {number} [params.l1=1.75] - Longitud brazo L₁ (m)
 * @param {number} [params.l2=1.45] - Longitud antebrazo L₂ (m)
 * @param {number|null} [params.theta2Deg=null] - Ángulo del hombro (°) para centros de masa reales
 * @param {number|null} [params.theta3Deg=null] - Ángulo del codo (°) para centros de masa reales
 * @param {boolean} [params.isGripped=true] - Si la pinza sujeta el cubo actualmente
 * @returns {object}
 */
export function calculateShoulderTorque({
  rHorizontal = 0,
  payloadMassKg = PHYSICAL_LIMITS.defaultMassKg,
  l1 = 1.75,
  l2 = 1.45,
  theta2Deg = null,
  theta3Deg = null,
  isGripped = true,
}) {
  const rawMass = Number(payloadMassKg);
  const cubeConfiguredMassKg = clampVal(
    Number.isFinite(rawMass) ? rawMass : PHYSICAL_LIMITS.defaultMassKg,
    PHYSICAL_LIMITS.minMassKg,
    PHYSICAL_LIMITS.maxMassKg
  );

  const g = PHYSICAL_LIMITS.gravity;
  const leverArmM = Math.abs(Number.isFinite(rHorizontal) ? rHorizontal : 0);
  const gripperMassKg = PHYSICAL_LIMITS.gripperMassKg;
  const activeCubeMassKg = isGripped ? cubeConfiguredMassKg : 0;
  const tcpMassKg = gripperMassKg + activeCubeMassKg;

  let link1MassKg = 0;
  let link2MassKg = 0;
  let torqueLink1Nm = 0;
  let torqueLink2Nm = 0;
  let torqueTcpNm = 0;
  let torqueNm = 0;

  if (theta2Deg !== null && theta3Deg !== null && Number.isFinite(theta2Deg) && Number.isFinite(theta3Deg)) {
    const t2Rad = degToRad(theta2Deg);
    const t23Rad = degToRad(theta2Deg + theta3Deg);

    const rCm1 = 0.5 * l1 * Math.cos(t2Rad);
    const rCm2 = l1 * Math.cos(t2Rad) + 0.5 * l2 * Math.cos(t23Rad);
    const rTcpSigned = l1 * Math.cos(t2Rad) + l2 * Math.cos(t23Rad);

    link1MassKg = l1 * PHYSICAL_LIMITS.link1DensityKgPerM;
    link2MassKg = l2 * PHYSICAL_LIMITS.link2DensityKgPerM;

    torqueLink1Nm = link1MassKg * g * rCm1;
    torqueLink2Nm = link2MassKg * g * rCm2;
    torqueTcpNm = tcpMassKg * g * rTcpSigned;
    torqueNm = Math.abs(torqueLink1Nm + torqueLink2Nm + torqueTcpNm);
  } else {
    torqueTcpNm = tcpMassKg * g * leverArmM;
    torqueNm = torqueTcpNm;
  }

  const totalSuspendedMassKg = link1MassKg + link2MassKg + tcpMassKg;
  const forceN = tcpMassKg * g;
  const totalForceN = totalSuspendedMassKg * g;

  const maxReachM = Math.max(0.1, l1 + l2);
  const reachRatio = leverArmM / maxReachM;
  const torqueRatio = torqueNm / PHYSICAL_LIMITS.safeTorqueLimitNm;
  const riskRatio = Math.max(reachRatio, torqueRatio);

  let level = 'green';
  let statusLabel = 'Seguro (Nominal)';
  if (riskRatio >= 0.88) {
    level = 'red';
    statusLabel = 'Sobrecarga (Torque / Alcance Crítico)';
  } else if (riskRatio >= 0.68) {
    level = 'amber';
    statusLabel = 'Precaución (Carga Media-Alta)';
  }

  const isOverloaded = level === 'red' || torqueNm >= PHYSICAL_LIMITS.safeTorqueLimitNm;

  return {
    massKg: cubeConfiguredMassKg,
    activeCubeMassKg,
    gripperMassKg,
    tcpMassKg,
    link1MassKg,
    link2MassKg,
    totalSuspendedMassKg,
    isGripped: Boolean(isGripped),
    gravity: g,
    forceN,
    totalForceN,
    leverArmM,
    torqueLink1Nm,
    torqueLink2Nm,
    torqueTcpNm,
    torqueNm,
    maxReachM,
    safeTorqueLimitNm: PHYSICAL_LIMITS.safeTorqueLimitNm,
    reachRatio,
    torqueRatio,
    riskRatio,
    level,
    isOverloaded,
    statusLabel,
  };
}

/**
 * Genera la telemetría matemática analítica completa paso a paso
 * para alimentar el panel analítico y los componentes de visualización.
 * 
 * Admite tanto el formato nuevo de múltiples articulaciones como la llamada legacy
 * getKinematicsTelemetry(r, thetaDeg) para máxima compatibilidad.
 */
export function getKinematicsTelemetry(arg1, arg2) {
  let params;
  if (typeof arg1 === 'object' && arg1 !== null) {
    params = {
      theta1Deg: arg1.theta1Deg ?? 45,
      theta2Deg: arg1.theta2Deg ?? 35,
      theta3Deg: arg1.theta3Deg ?? -25,
      l1: arg1.l1 ?? 1.75,
      l2: arg1.l2 ?? 1.45,
      hBase: arg1.hBase ?? 0.60,
      payloadMassKg: arg1.payloadMassKg ?? PHYSICAL_LIMITS.defaultMassKg,
      isGripped: arg1.isGripped ?? false,
    };
  } else {
    // Modo compatibilidad si se le pasa (r, thetaDeg)
    const rParam = Number(arg1) || 3.20;
    const t1Param = Number(arg2) || 45;
    params = {
      theta1Deg: t1Param,
      theta2Deg: 35,
      theta3Deg: -25,
      l1: rParam * 0.55,
      l2: rParam * 0.45,
      hBase: 0.60,
      payloadMassKg: PHYSICAL_LIMITS.defaultMassKg,
      isGripped: false,
    };
  }

  const fk = forwardKinematics3DOF(params);
  const fmt = (num, dec = 2) => Number(num).toFixed(dec);

  const t1Rad = fk.angles.t1Rad;
  const t2Rad = fk.angles.t2Rad;
  const t3Rad = fk.angles.t3Rad;
  const t23Rad = fk.angles.t23Rad;

  const cosT1 = Math.cos(t1Rad);
  const sinT1 = Math.sin(t1Rad);
  const cosT2 = Math.cos(t2Rad);
  const sinT2 = Math.sin(t2Rad);
  const cosT3 = Math.cos(t3Rad);
  const sinT3 = Math.sin(t3Rad);
  const cosT23 = Math.cos(t23Rad);
  const sinT23 = Math.sin(t23Rad);

  const rElbow = fk.elbow.r;
  const zElbow = fk.elbow.z;
  const rTcp = fk.tcp.rGround;
  const zTcp = fk.tcp.z;
  const x = fk.tcp.x;
  const y = fk.tcp.y;
  const z = fk.tcp.z;

  // Verificación inversa básica del plano de suelo
  const invGround = cartesianToPolar(x, y);

  // Cálculo físico realista de torque estático en el hombro (eslabones + pinza + cubo si está sujeto)
  const torque = calculateShoulderTorque({
    rHorizontal: rTcp,
    payloadMassKg: params.payloadMassKg,
    l1: params.l1,
    l2: params.l2,
    theta2Deg: fk.angles.t2Deg,
    theta3Deg: fk.angles.t3Deg,
    isGripped: params.isGripped,
  });

  // Estimación cualitativa de par/torque gravitatorio en articulaciones (Normalizado)
  const shoulderTorqueFactor = Math.max(0, Math.min(100, Math.round((Math.abs(rTcp) / (params.l1 + params.l2)) * 100)));
  const elbowTorqueFactor = Math.max(0, Math.min(100, Math.round((Math.abs(params.l2 * cosT23) / params.l2) * 100)));

  // Cinemática Inversa Analítica para los ángulos del Codo (θ₃) y Hombro (θ₂)
  const rho = fk.tcp.rhoShoulder;
  const l1Val = params.l1;
  const l2Val = params.l2;
  const deltaZ = fk.tcp.deltaZ;

  // 1. Ángulo del Codo (θ₃) por Ley de Cosenos
  let cosTheta3 = (rho * rho - l1Val * l1Val - l2Val * l2Val) / (2 * l1Val * l2Val);
  cosTheta3 = Math.max(-1, Math.min(1, cosTheta3));
  const absTheta3Rad = Math.acos(cosTheta3);
  const signT3 = params.theta3Deg < 0 ? -1 : 1;
  const invTheta3Rad = signT3 * absTheta3Rad;
  const invTheta3Deg = radToDeg(invTheta3Rad);

  // 2. Ángulo del Hombro (θ₂) por Descomposición φ + β
  const phiRad = Math.atan2(deltaZ, rTcp);
  const phiDeg = radToDeg(phiRad);

  let cosBeta = rho < 1e-7
    ? 1
    : (l1Val * l1Val + rho * rho - l2Val * l2Val) / (2 * l1Val * rho);
  cosBeta = Math.max(-1, Math.min(1, cosBeta));
  const betaRad = Math.acos(cosBeta);
  const betaDeg = radToDeg(betaRad);

  const invTheta2Rad = phiRad - (signT3 * betaRad);
  const invTheta2Deg = radToDeg(invTheta2Rad);

  return {
    params,
    fk,
    safety: fk.safety,
    torque,
    direct: {
      // Coordenadas resultantes principales
      resultX: fmt(x, 3),
      resultY: fmt(y, 3),
      resultZ: fmt(z, 3),
      resultRGround: fmt(rTcp, 3),
      resultRho: fmt(fk.tcp.rhoShoulder, 3),
      xRaw: x,
      yRaw: y,
      zRaw: z,
      rGroundRaw: rTcp,

      // Valores trigonométricos individuales
      cosT1: fmt(cosT1, 4),
      sinT1: fmt(sinT1, 4),
      cosT2: fmt(cosT2, 4),
      sinT2: fmt(sinT2, 4),
      cosT3: fmt(cosT3, 4),
      sinT3: fmt(sinT3, 4),
      cosT23: fmt(cosT23, 4),
      sinT23: fmt(sinT23, 4),

      // Fórmulas desglosadas con notación teórica exacta (L₀, L₁, L₂, r)
      formulaR: "r = L₁ · cos(θ₂) + L₂ · cos(θ₂ + θ₃)",
      substitutionR: `r = ${fmt(params.l1)} · cos(${fmt(params.theta2Deg)}°) + ${fmt(params.l2)} · cos(${fmt(params.theta2Deg + params.theta3Deg)}°)`,
      intermediateR: `r = ${fmt(params.l1)} · (${fmt(cosT2, 3)}) + ${fmt(params.l2)} · (${fmt(cosT23, 3)}) = ${fmt(rElbow, 3)} + ${fmt(rTcp - rElbow, 3)}`,
      resultR: fmt(rTcp, 3),

      formulaZ: "Z = L₀ + L₁ · sin(θ₂) + L₂ · sin(θ₂ + θ₃)",
      substitutionZ: `Z = ${fmt(params.hBase)} + ${fmt(params.l1)} · sin(${fmt(params.theta2Deg)}°) + ${fmt(params.l2)} · sin(${fmt(params.theta2Deg + params.theta3Deg)}°)`,
      intermediateZ: `Z = ${fmt(params.hBase)} + ${fmt(params.l1)} · (${fmt(sinT2, 3)}) + ${fmt(params.l2)} · (${fmt(sinT23, 3)}) = ${fmt(params.hBase)} + ${fmt(zElbow - params.hBase, 3)} + ${fmt(zTcp - zElbow, 3)}`,
      resultZVal: fmt(zTcp, 3),

      formulaX: "X = r · cos(θ₁)",
      substitutionX: `X = ${fmt(rTcp, 3)} · cos(${fmt(params.theta1Deg)}°)`,
      intermediateX: `X = ${fmt(rTcp, 3)} · (${fmt(cosT1, 4)})`,

      formulaY: "Y = r · sin(θ₁)",
      substitutionY: `Y = ${fmt(rTcp, 3)} · sin(${fmt(params.theta1Deg)}°)`,
      intermediateY: `Y = ${fmt(rTcp, 3)} · (${fmt(sinT1, 4)})`,
    },
    servos: {
      j1: {
        id: 'J1',
        name: 'Servomotor Base',
        axis: 'Rotación Azimuth (Yaw)',
        angleDeg: params.theta1Deg,
        angleRad: t1Rad,
        range: `[${PHYSICAL_LIMITS.theta1.min}°, +${PHYSICAL_LIMITS.theta1.max}°]`,
        loadFactor: 15,
      },
      j2: {
        id: 'J2',
        name: 'Servomotor Hombro',
        axis: 'Elevación (Pitch)',
        angleDeg: params.theta2Deg,
        angleRad: t2Rad,
        range: `[${PHYSICAL_LIMITS.theta2.min}°, +${PHYSICAL_LIMITS.theta2.max}°]`,
        loadFactor: shoulderTorqueFactor,
        torqueNm: torque.torqueNm,
      },
      j3: {
        id: 'J3',
        name: 'Servomotor Codo',
        axis: 'Flexión (Pitch)',
        angleDeg: params.theta3Deg,
        angleRad: t3Rad,
        range: `[${PHYSICAL_LIMITS.theta3.min}°, +${PHYSICAL_LIMITS.theta3.max}°]`,
        loadFactor: elbowTorqueFactor,
      },
    },
    inverse: {
      formulaR: "r = √(X² + Y²)",
      substitutionR: `r = √[(${fmt(x)})² + (${fmt(y)})²]`,
      intermediateR: `r = √[${fmt(x * x)} + ${fmt(y * y)}]`,
      resultR: fmt(invGround.r, 3),

      formulaTheta: "θ₁ = atan2(Y, X)",
      substitutionTheta: `θ₁ = atan2(${fmt(y)}, ${fmt(x)})`,
      intermediateRad: `${fmt(invGround.thetaRad, 4)} rad`,
      resultThetaDeg: `${fmt(invGround.thetaDeg, 2)}°`,

      formulaRho: "ρ = √[r² + (Z - L₀)²]",
      substitutionRho: `ρ = √[(${fmt(rTcp, 2)})² + (${fmt(deltaZ, 2)})²]`,
      resultRho: fmt(rho, 3),

      formulaCosT3: "cos(θ₃) = (ρ² - L₁² - L₂²) / (2 · L₁ · L₂)",
      substitutionCosT3: `cos(θ₃) = [(${fmt(rho, 2)})² - (${fmt(l1Val, 2)})² - (${fmt(l2Val, 2)})²] / [2 · ${fmt(l1Val, 2)} · ${fmt(l2Val, 2)}]`,
      cosT3Val: fmt(cosTheta3, 4),
      formulaTheta3: "θ₃ = arccos(cos(θ₃))",
      resultTheta3Deg: `${fmt(invTheta3Deg, 2)}°`,

      formulaPhi: "φ = atan2(Z - L₀, r)",
      substitutionPhi: `φ = atan2(${fmt(deltaZ, 2)}, ${fmt(rTcp, 2)})`,
      resultPhiDeg: `${fmt(phiDeg, 2)}°`,

      formulaBeta: "cos(β) = (L₁² + ρ² - L₂²) / (2 · L₁ · ρ)",
      substitutionBeta: `cos(β) = [(${fmt(l1Val, 2)})² + (${fmt(rho, 2)})² - (${fmt(l2Val, 2)})²] / [2 · ${fmt(l1Val, 2)} · ${fmt(rho, 2)}] = ${fmt(cosBeta, 4)}`,
      resultBetaDeg: `${fmt(betaDeg, 2)}°`,

      formulaTheta2: "θ₂ = φ + β",
      substitutionTheta2: `θ₂ = ${fmt(phiDeg, 2)}° + ${fmt(betaDeg, 2)}°`,
      resultTheta2Deg: `${fmt(invTheta2Deg, 2)}°`,
    },
  };
}

/**
 * CINEMÁTICA INVERSA 3D VALIDADA (INVERSE KINEMATICS - 3 DOF)
 * Resuelve los ángulos articulares exactos (θ₁, θ₂, θ₃) a partir de una coordenada cartesiana objetivo (X, Y, Z),
 * aplicando filtro de alcance válido, prioridad codo arriba (θ₃ ≤ 0), control de singularidades y colisiones.
 * 
 * @param {object} params
 * @param {number} params.targetX - Coordenada objetivo X en la mesa
 * @param {number} params.targetY - Coordenada objetivo Y en la mesa
 * @param {number} params.targetZ - Altura objetivo Z
 * @param {number} [params.l1=1.75] - Longitud del brazo
 * @param {number} [params.l2=1.45] - Longitud del antebrazo
 * @param {number} [params.hBase=0.60] - Altura del pedestal
 * @param {'up'|'down'|'elbow_down_positive'} [params.elbowConfig='up'] - Prioriza codo arriba (θ₃ ≤ 0) por defecto
 * @param {number} [params.currentTheta1Deg=0] - Ángulo J1 actual para preservar orientación en singularidad r → 0
 * @param {boolean} [params.checkJointLimits=false] - Validar límites estrictos de sliders articulares
 * @returns {{ isReachable: boolean, isValid: boolean, hasTableCollision: boolean, hasPedestalCollision: boolean, hasJointLimitCollision: boolean, errorMessage: string|null, theta1Deg: number, theta2Deg: number, theta3Deg: number, rho: number, r: number, deltaZ: number }}
 */
export function inverseKinematics3DOF({
  targetX,
  targetY,
  targetZ,
  l1 = 1.75,
  l2 = 1.45,
  hBase = 0.60,
  elbowConfig = 'up',
  currentTheta1Deg = 0,
  checkJointLimits = false,
}) {
  // Protección contra entradas no numéricas (NaN / Infinity)
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY) || !Number.isFinite(targetZ)) {
    return {
      isReachable: false,
      isValid: false,
      hasTableCollision: false,
      hasPedestalCollision: false,
      hasJointLimitCollision: false,
      collisionType: 'invalid',
      errorMessage: 'Coordenadas inválidas',
      theta1Deg: 0,
      theta2Deg: 45,
      theta3Deg: -45,
      rho: 0,
      r: 0,
      deltaZ: 0,
    };
  }

  const EPS = 1e-6;

  // 1. Proyección radial plana y altura relativa al eje del hombro
  const r = Math.hypot(targetX, targetY);
  const deltaZ = targetZ - hBase;

  // 2. Servomotor Base (J1): Control de singularidad sobre el eje central (r → 0)
  const t1Deg =
    r < 1e-7
      ? Number.isFinite(currentTheta1Deg)
        ? currentTheta1Deg
        : 0
      : radToDeg(Math.atan2(targetY, targetX));

  // 3. Distancia esférica 3D euclídea desde el pivote del hombro (0, 0, hBase)
  const rho = Math.hypot(r, deltaZ);
  const maxReach = l1 + l2;
  const minReach = Math.abs(l1 - l2);

  // Filtro de Alcance Válido: |L₁ - L₂| ≤ ρ ≤ L₁ + L₂
  const isReachable = rho >= minReach - EPS && rho <= maxReach + EPS;
  const clampedRho = clampVal(rho, minReach, maxReach);

  // 4. Servomotor Codo (J3): Ley de Cosenos (sin NaN incluso en alcance máximo θ₃ ≈ 0°)
  let cosT3 = (clampedRho * clampedRho - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  cosT3 = clampVal(cosT3, -1, 1);

  // Priorizar configuración Codo Arriba (θ₃ ≤ 0 => t3Sign = -1, θ₂ = φ + β)
  const t3Sign = elbowConfig === 'elbow_down_positive' ? 1 : -1;
  const t3Rad = t3Sign * Math.acos(cosT3);
  const t3Deg = radToDeg(t3Rad);

  // 5. Servomotor Hombro (J2): Descomposición φ + β con guarda en singularidad ρ → 0
  const phiRad = Math.atan2(deltaZ, r);
  let cosBeta =
    clampedRho < 1e-7
      ? 1
      : (l1 * l1 + clampedRho * clampedRho - l2 * l2) / (2 * l1 * clampedRho);
  cosBeta = clampVal(cosBeta, -1, 1);
  const betaRad = Math.acos(cosBeta);

  const t2Rad = phiRad - t3Sign * betaRad;
  const t2Deg = radToDeg(t2Rad);

  // 6. Validación de colisiones con mesa y pedestal
  const zElbow = hBase + l1 * Math.sin(t2Rad);
  const hasTableCollision =
    targetZ < PHYSICAL_LIMITS.minTableZ - EPS || zElbow < PHYSICAL_LIMITS.minTableZ - EPS;
  const hasPedestalCollision =
    r < PHYSICAL_LIMITS.pedestalRadius - EPS && targetZ < PHYSICAL_LIMITS.pedestalHeight - EPS;
  const hasJointLimitCollision =
    checkJointLimits &&
    (t2Deg < PHYSICAL_LIMITS.theta2.min - EPS ||
      t2Deg > PHYSICAL_LIMITS.theta2.max + EPS ||
      t3Deg < PHYSICAL_LIMITS.theta3.min - EPS ||
      t3Deg > PHYSICAL_LIMITS.theta3.max + EPS);

  const isValid =
    isReachable && !hasTableCollision && !hasPedestalCollision && !hasJointLimitCollision;

  let errorMessage = null;
  if (!isReachable) {
    errorMessage = `Punto fuera de alcance / Colisión con mesa (|L₁ - L₂|=${minReach.toFixed(2)}m ≤ ρ ≤ ${(maxReach).toFixed(2)}m)`;
  } else if (hasTableCollision) {
    errorMessage = `Punto fuera de alcance / Colisión con mesa (Z mínima: ${PHYSICAL_LIMITS.minTableZ.toFixed(2)} m)`;
  } else if (hasPedestalCollision) {
    errorMessage = `Punto fuera de alcance / Colisión con pedestal central (r < ${PHYSICAL_LIMITS.pedestalRadius} m, Z < ${PHYSICAL_LIMITS.pedestalHeight} m)`;
  } else if (hasJointLimitCollision) {
    errorMessage = 'Punto fuera de alcance / Límite físico articular excedido';
  }

  return {
    isReachable,
    isValid,
    hasTableCollision,
    hasPedestalCollision,
    hasJointLimitCollision,
    errorMessage,
    theta1Deg: cleanZero(t1Deg),
    theta2Deg: cleanZero(t2Deg),
    theta3Deg: cleanZero(t3Deg),
    rho: cleanZero(rho),
    r: cleanZero(r),
    deltaZ: cleanZero(deltaZ),
  };
}
