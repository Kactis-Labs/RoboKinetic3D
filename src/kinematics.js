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
 * Calcula la posición espacial exacta de cada articulación y del efector final.
 * 
 * Parámetros:
 * - theta1Deg: Giro de la Base (eje vertical Y en Three.js / plano X-Y de la mesa)
 * - theta2Deg: Inclinación del Hombro respecto a la horizontal
 * - theta3Deg: Flexión del Codo respecto al eslabón 1
 * - l1: Longitud del Eslabón 1 (Húmero / Brazo)
 * - l2: Longitud del Eslabón 2 (Cúbito-Radio / Antebrazo)
 * - hBase: Altura del pedestal de la base al eje del servomotor del hombro
 * 
 * @returns {object} Posiciones articulares (Codo, TCP, proyecciones)
 */
export function forwardKinematics3DOF({
  theta1Deg = 45,
  theta2Deg = 30,
  theta3Deg = -20,
  l1 = 1.8,
  l2 = 1.4,
  hBase = 0.6,
}) {
  const t1Rad = degToRad(theta1Deg);
  const t2Rad = degToRad(theta2Deg);
  const t3Rad = degToRad(theta3Deg);
  const t23Rad = t2Rad + t3Rad; // Ángulo absoluto del antebrazo respecto a la horizontal

  // 1. Proyecciones en el plano de elevación (radial-horizontal vs vertical)
  // Posición del servomotor del Codo (Joint 3):
  const rElbow = l1 * Math.cos(t2Rad);
  const zElbow = hBase + l1 * Math.sin(t2Rad);

  // Posición del Efector Final (TCP):
  const rTcp = rElbow + l2 * Math.cos(t23Rad);
  const zTcp = zElbow + l2 * Math.sin(t23Rad);

  // 2. Proyección espacial con el servomotor de la Base (θ₁):
  // Codo en 3D:
  const elbowX = rElbow * Math.cos(t1Rad);
  const elbowY = rElbow * Math.sin(t1Rad);
  const elbowZ = zElbow;

  // TCP en 3D:
  const tcpX = rTcp * Math.cos(t1Rad);
  const tcpY = rTcp * Math.sin(t1Rad);
  const tcpZ = zTcp;

  // Distancia esférica euclidiana 3D desde el eje del hombro (0, 0, hBase):
  const deltaZ = tcpZ - hBase;
  const rhoFromShoulder = Math.hypot(rTcp, deltaZ);
  const elevationAngleRad = Math.atan2(deltaZ, rTcp);
  const elevationAngleDeg = radToDeg(elevationAngleRad);

  // Distancia esférica total desde el origen en el suelo (0, 0, 0):
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
      rGround: cleanZero(rTcp), // Radio en el plano del suelo
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
      l1: arg1.l1 ?? 1.8,
      l2: arg1.l2 ?? 1.4,
      hBase: arg1.hBase ?? 0.6,
    };
  } else {
    // Modo compatibilidad si se le pasa (r, thetaDeg)
    const rParam = Number(arg1) || 3.5;
    const t1Param = Number(arg2) || 45;
    // Si se pasa r, repartimos proporcionalmente entre l1 y l2
    params = {
      theta1Deg: t1Param,
      theta2Deg: 30,
      theta3Deg: -20,
      l1: rParam * 0.56,
      l2: rParam * 0.44,
      hBase: 0.6,
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

  let cosBeta = (l1Val * l1Val + rho * rho - l2Val * l2Val) / (2 * l1Val * rho);
  cosBeta = Math.max(-1, Math.min(1, cosBeta));
  const betaRad = Math.acos(cosBeta);
  const betaDeg = radToDeg(betaRad);

  const invTheta2Rad = phiRad - (signT3 * betaRad);
  const invTheta2Deg = radToDeg(invTheta2Rad);

  return {
    params,
    fk,
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
      // 1. Alcance horizontal total (r)
      formulaR: "r = L₁ · cos(θ₂) + L₂ · cos(θ₂ + θ₃)",
      substitutionR: `r = ${fmt(params.l1)} · cos(${fmt(params.theta2Deg)}°) + ${fmt(params.l2)} · cos(${fmt(params.theta2Deg + params.theta3Deg)}°)`,
      intermediateR: `r = ${fmt(params.l1)} · (${fmt(cosT2, 3)}) + ${fmt(params.l2)} · (${fmt(cosT23, 3)}) = ${fmt(rElbow, 3)} + ${fmt(rTcp - rElbow, 3)}`,
      resultR: fmt(rTcp, 3),

      // 2. Altura vertical total (Z o Y según el eje)
      formulaZ: "Z = L₀ + L₁ · sin(θ₂) + L₂ · sin(θ₂ + θ₃)",
      substitutionZ: `Z = ${fmt(params.hBase)} + ${fmt(params.l1)} · sin(${fmt(params.theta2Deg)}°) + ${fmt(params.l2)} · sin(${fmt(params.theta2Deg + params.theta3Deg)}°)`,
      intermediateZ: `Z = ${fmt(params.hBase)} + ${fmt(params.l1)} · (${fmt(sinT2, 3)}) + ${fmt(params.l2)} · (${fmt(sinT23, 3)}) = ${fmt(params.hBase)} + ${fmt(zElbow - params.hBase, 3)} + ${fmt(zTcp - zElbow, 3)}`,
      resultZVal: fmt(zTcp, 3),

      // 3. Proyecciones en el plano de la mesa (Giro de Base θ₁)
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
        range: '[-180°, +180°]',
        loadFactor: 15,
      },
      j2: {
        id: 'J2',
        name: 'Servomotor Hombro',
        axis: 'Elevación (Pitch)',
        angleDeg: params.theta2Deg,
        angleRad: t2Rad,
        range: '[-20°, +100°]',
        loadFactor: shoulderTorqueFactor,
      },
      j3: {
        id: 'J3',
        name: 'Servomotor Codo',
        axis: 'Flexión (Pitch)',
        angleDeg: params.theta3Deg,
        angleRad: t3Rad,
        range: '[-120°, +60°]',
        loadFactor: elbowTorqueFactor,
      },
    },
    inverse: {
      // 1. Pitágoras en el suelo
      formulaR: "r = √(X² + Y²)",
      substitutionR: `r = √[(${fmt(x)})² + (${fmt(y)})²]`,
      intermediateR: `r = √[${fmt(x * x)} + ${fmt(y * y)}]`,
      resultR: fmt(invGround.r, 3),

      // 2. Ángulo de la Base
      formulaTheta: "θ₁ = atan2(Y, X)",
      substitutionTheta: `θ₁ = atan2(${fmt(y)}, ${fmt(x)})`,
      intermediateRad: `${fmt(invGround.thetaRad, 4)} rad`,
      resultThetaDeg: `${fmt(invGround.thetaDeg, 2)}°`,

      // 3. Distancia esférica euclídea 3D desde el hombro
      formulaRho: "ρ = √[r² + (Z - L₀)²]",
      substitutionRho: `ρ = √[(${fmt(rTcp, 2)})² + (${fmt(deltaZ, 2)})²]`,
      resultRho: fmt(rho, 3),

      // 4. Ángulo del Codo (θ₃)
      formulaCosT3: "cos(θ₃) = (ρ² - L₁² - L₂²) / (2 · L₁ · L₂)",
      substitutionCosT3: `cos(θ₃) = [(${fmt(rho, 2)})² - (${fmt(l1Val, 2)})² - (${fmt(l2Val, 2)})²] / [2 · ${fmt(l1Val, 2)} · ${fmt(l2Val, 2)}]`,
      cosT3Val: fmt(cosTheta3, 4),
      formulaTheta3: "θ₃ = arccos(cos(θ₃))",
      resultTheta3Deg: `${fmt(invTheta3Deg, 2)}°`,

      // 5. Ángulo del Hombro (θ₂)
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
