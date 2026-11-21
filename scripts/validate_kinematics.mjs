import assert from 'node:assert/strict';
import {
  PHYSICAL_LIMITS,
  forwardKinematics3DOF,
  inverseKinematics3DOF,
  clampPoseToWorkspace,
  calculateShoulderTorque,
} from '../src/kinematics.js';

const L1 = 1.75;
const L2 = 1.45;
const H_BASE = 0.60;

function assertFinitePose(res, label) {
  for (const key of ['theta1Deg', 'theta2Deg', 'theta3Deg', 'rho', 'r', 'deltaZ']) {
    assert.ok(Number.isFinite(res[key]), `${label}: ${key} no debe ser NaN/Infinity (fue ${res[key]})`);
  }
}

console.log('=== 1. Pruebas de Singularidades IK (sin NaN) ===');

// 1.1 Eje central r = 0 (Z = 2.50 m, por encima del pedestal)
const ikCenterAxis = inverseKinematics3DOF({
  targetX: 0,
  targetY: 0,
  targetZ: 2.50,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
  currentTheta1Deg: 42,
});
assertFinitePose(ikCenterAxis, 'Singularidad r=0');
assert.equal(ikCenterAxis.isReachable, true, 'r=0, Z=2.50 debe ser alcanzable');
assert.equal(ikCenterAxis.isValid, true, 'r=0, Z=2.50 debe ser válido');
assert.equal(ikCenterAxis.theta1Deg, 42, 'r=0 debe preservar θ₁ actual');
assert.ok(ikCenterAxis.theta3Deg <= 0, 'r=0 debe mantener codo arriba (θ₃ ≤ 0)');

const fkCenterAxis = forwardKinematics3DOF({
  theta1Deg: ikCenterAxis.theta1Deg,
  theta2Deg: ikCenterAxis.theta2Deg,
  theta3Deg: ikCenterAxis.theta3Deg,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
});
assert.ok(Math.abs(fkCenterAxis.tcp.x - 0) < 1e-4, 'FK(IK(0,0,2.5)).x ≈ 0');
assert.ok(Math.abs(fkCenterAxis.tcp.y - 0) < 1e-4, 'FK(IK(0,0,2.5)).y ≈ 0');
assert.ok(Math.abs(fkCenterAxis.tcp.z - 2.50) < 1e-4, 'FK(IK(0,0,2.5)).z ≈ 2.50');

// 1.2 Alcance máximo ρ = L₁ + L₂ = 3.20 m (θ₃ ≈ 0°)
const ikMaxReach = inverseKinematics3DOF({
  targetX: 3.20,
  targetY: 0,
  targetZ: 0.60,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
});
assertFinitePose(ikMaxReach, 'Alcance máximo');
assert.equal(ikMaxReach.isReachable, true);
assert.equal(ikMaxReach.isValid, true);
assert.ok(Math.abs(ikMaxReach.theta3Deg) < 1e-4, 'En alcance máximo θ₃ debe ser ~0°');
const fkMaxReach = forwardKinematics3DOF({
  theta1Deg: ikMaxReach.theta1Deg,
  theta2Deg: ikMaxReach.theta2Deg,
  theta3Deg: ikMaxReach.theta3Deg,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
});
assert.ok(Math.abs(fkMaxReach.tcp.x - 3.20) < 1e-4, 'FK(IK(3.20,0,0.60)).x ≈ 3.20');
assert.ok(Math.abs(fkMaxReach.tcp.z - 0.60) < 1e-4, 'FK(IK(3.20,0,0.60)).z ≈ 0.60');

// 1.3 Alcance mínimo ρ = |L₁ - L₂| = 0.30 m (singularidad matemática de plegado θ₃ = -180° sin NaN)
const ikMinReach = inverseKinematics3DOF({
  targetX: 0,
  targetY: 0,
  targetZ: 0.90,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
});
assertFinitePose(ikMinReach, 'Alcance mínimo');
assert.equal(ikMinReach.isReachable, true);
assert.equal(ikMinReach.isValid, true);
assert.ok(Math.abs(Math.abs(ikMinReach.theta3Deg) - 180) < 1e-4, 'En alcance mínimo teórico |θ₃| ≈ 180°');
const fkMinReachGeom = forwardKinematics3DOF({
  theta1Deg: ikMinReach.theta1Deg,
  theta2Deg: ikMinReach.theta2Deg,
  theta3Deg: ikMinReach.theta3Deg,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
  enforceLimits: false,
});
assert.ok(Math.abs(fkMinReachGeom.tcp.z - 0.90) < 1e-4, 'FK geométrico(IK(0,0,0.90)).z ≈ 0.90');

// 1.4 Fuera de rango superior (ρ = 5.0 m > 3.20 m) e inferior (ρ = 0.10 m < 0.30 m)
const ikTooFar = inverseKinematics3DOF({ targetX: 4.0, targetY: 3.0, targetZ: 0.60, l1: L1, l2: L2, hBase: H_BASE });
assertFinitePose(ikTooFar, 'Fuera de rango superior');
assert.equal(ikTooFar.isReachable, false);
assert.equal(ikTooFar.isValid, false);

const ikTooClose = inverseKinematics3DOF({ targetX: 0.05, targetY: 0.05, targetZ: 0.65, l1: L1, l2: L2, hBase: H_BASE });
assertFinitePose(ikTooClose, 'Fuera de rango inferior');
assert.equal(ikTooClose.isReachable, false);
assert.equal(ikTooClose.isValid, false);

// 1.5 Entradas NaN / Infinity
const ikNaN = inverseKinematics3DOF({ targetX: NaN, targetY: 1.0, targetZ: 1.0 });
assertFinitePose(ikNaN, 'Entradas NaN');
assert.equal(ikNaN.isValid, false);

console.log('✓ Singularidades validadas sin NaN.');

console.log('=== 2. Consistencia FK(IK(X, Y, Z)) en malla del espacio válido ===');
let checkedPoints = 0;
const testAngles = [-135, -45, 0, 30, 90, 150];
const testRadii = [0.95, 1.45, 2.0, 2.5, 3.0];
const testHeights = [0.18, 0.45, 0.85, 1.40, 2.10];

for (const angDeg of testAngles) {
  const rad = (angDeg * Math.PI) / 180;
  for (const r of testRadii) {
    const x = r * Math.cos(rad);
    const y = r * Math.sin(rad);
    for (const z of testHeights) {
      const rho = Math.hypot(r, z - H_BASE);
      if (rho < Math.abs(L1 - L2) + 1e-4 || rho > L1 + L2 - 1e-4) continue;

      const ik = inverseKinematics3DOF({
        targetX: x,
        targetY: y,
        targetZ: z,
        l1: L1,
        l2: L2,
        hBase: H_BASE,
      });
      assertFinitePose(ik, `Malla (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      assert.equal(ik.isValid, true, `Punto válido rechazado: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) -> ${ik.errorMessage}`);
      assert.ok(ik.theta3Deg <= 0, `Debe priorizar codo arriba (θ₃ ≤ 0), obtuvo ${ik.theta3Deg}`);

      const fk = forwardKinematics3DOF({
        theta1Deg: ik.theta1Deg,
        theta2Deg: ik.theta2Deg,
        theta3Deg: ik.theta3Deg,
        l1: L1,
        l2: L2,
        hBase: H_BASE,
      });

      assert.ok(Math.abs(fk.tcp.x - x) < 1e-4, `Error X en (${x}, ${y}, ${z}): ${fk.tcp.x}`);
      assert.ok(Math.abs(fk.tcp.y - y) < 1e-4, `Error Y en (${x}, ${y}, ${z}): ${fk.tcp.y}`);
      assert.ok(Math.abs(fk.tcp.z - z) < 1e-4, `Error Z en (${x}, ${y}, ${z}): ${fk.tcp.z}`);
      checkedPoints++;
    }
  }
}
console.log(`✓ ${checkedPoints} puntos FK(IK(X,Y,Z)) validados con precisión < 1e-4 m.`);

console.log('=== 3. Validación de Protecciones Físicas (Mesa, Pedestal y Clamping) ===');

// 3.1 IK rechaza colisión con mesa (Z < 0.12 m)
const ikTableHit = inverseKinematics3DOF({ targetX: 1.5, targetY: 1.5, targetZ: 0.05, l1: L1, l2: L2, hBase: H_BASE });
assert.equal(ikTableHit.isValid, false);
assert.equal(ikTableHit.hasTableCollision, true);

// 3.2 IK rechaza colisión con pedestal (r < 0.88 m y Z < 0.75 m)
const ikPedestalHit = inverseKinematics3DOF({ targetX: 0.4, targetY: 0.3, targetZ: 0.4, l1: L1, l2: L2, hBase: H_BASE });
assert.equal(ikPedestalHit.isValid, false);
assert.equal(ikPedestalHit.hasPedestalCollision, true);

// 3.3 FK acota postura que bajaría por debajo de la mesa
const fkUnderTable = forwardKinematics3DOF({
  theta1Deg: 0,
  theta2Deg: -20,
  theta3Deg: -60,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
});
assert.equal(fkUnderTable.safety.clamped, true, 'Debe acotar postura bajo la mesa');
assert.ok(fkUnderTable.tcp.z >= PHYSICAL_LIMITS.minTableZ - 1e-4, `TCP Z debe ser ≥ ${PHYSICAL_LIMITS.minTableZ}, obtuvo ${fkUnderTable.tcp.z}`);
assert.ok(fkUnderTable.elbow.z >= PHYSICAL_LIMITS.minTableZ - 1e-4, 'Codo Z debe mantenerse sobre la mesa');

// 3.4 Clamping articular acota sliders fuera de rango y evita pedestal
const clampedJoints = clampPoseToWorkspace({
  theta1Deg: 220,
  theta2Deg: 130,
  theta3Deg: -160,
  l1: L1,
  l2: L2,
  hBase: H_BASE,
});
assert.equal(clampedJoints.clamped, true);
assert.ok(clampedJoints.theta1Deg <= 180 && clampedJoints.theta1Deg >= -180);
assert.ok(clampedJoints.theta2Deg <= 100 && clampedJoints.theta2Deg >= -20);
assert.ok(clampedJoints.theta3Deg <= 60 && clampedJoints.theta3Deg >= -120);

// 3.5 Waypoints de Pick & Place no son bloqueados por límites de seguridad
for (const wp of [
  { x: 1.45, y: 1.55, z: 0.75 },
  { x: 1.45, y: 1.55, z: 0.18 },
  { x: 1.45, y: -1.55, z: 0.75 },
  { x: 1.45, y: -1.55, z: 0.18 },
]) {
  const ikWp = inverseKinematics3DOF({
    targetX: wp.x,
    targetY: wp.y,
    targetZ: wp.z,
    l1: L1,
    l2: L2,
    hBase: H_BASE,
    elbowConfig: 'down',
  });
  assert.equal(ikWp.isValid, true, `Waypoint Pick&Place debe ser válido: (${wp.x},${wp.y},${wp.z})`);
  const fkWp = forwardKinematics3DOF({
    theta1Deg: ikWp.theta1Deg,
    theta2Deg: ikWp.theta2Deg,
    theta3Deg: ikWp.theta3Deg,
    l1: L1,
    l2: L2,
    hBase: H_BASE,
  });
  assert.equal(fkWp.safety.clamped, false, `Waypoint Pick&Place no debe acotarse: (${wp.x},${wp.y},${wp.z})`);
}

console.log('✓ Protecciones físicas de mesa, pedestal y articulaciones validadas.');

console.log('=== 4. Validación de Torque Estático Realista en el Hombro ===');
// 4.1 Modo directo (sin ángulos): incluye pinza vacía (0.35 kg) + cubo cuando isGripped=true
const tDirect = calculateShoulderTorque({ rHorizontal: 1.0, payloadMassKg: 0.5, l1: L1, l2: L2, isGripped: true });
assert.ok(Math.abs(tDirect.torqueNm - (0.35 + 0.5) * 9.81 * 1.0) < 1e-6);
assert.equal(tDirect.level, 'green');
assert.equal(tDirect.isOverloaded, false);

// 4.2 Modo realista 3D: sin sujetar el cubo, el slider del cubo no altera el torque (solo pesan eslabones + pinza)
const tUngrippedSmall = calculateShoulderTorque({
  rHorizontal: 1.06,
  payloadMassKg: 0.5,
  l1: L1,
  l2: L2,
  theta2Deg: 100,
  theta3Deg: -120,
  isGripped: false,
});
const tUngrippedHeavy = calculateShoulderTorque({
  rHorizontal: 1.06,
  payloadMassKg: 5.0,
  l1: L1,
  l2: L2,
  theta2Deg: 100,
  theta3Deg: -120,
  isGripped: false,
});
assert.equal(tUngrippedSmall.activeCubeMassKg, 0);
assert.equal(tUngrippedHeavy.activeCubeMassKg, 0);
assert.ok(Math.abs(tUngrippedSmall.torqueNm - tUngrippedHeavy.torqueNm) < 1e-6, 'Sin sujetar el cubo, cambiar masa del cubo no altera el torque');
assert.ok(tUngrippedSmall.torqueNm > 0, 'Eslabones y pinza vacía generan torque realista > 0');
assert.equal(tUngrippedSmall.level, 'green');

// 4.3 Sujetando cubo pesado a largo alcance genera sobrecarga (isOverloaded === true)
const tOverload = calculateShoulderTorque({
  rHorizontal: 3.20,
  payloadMassKg: 5.0,
  l1: L1,
  l2: L2,
  theta2Deg: 0,
  theta3Deg: 0,
  isGripped: true,
});
assert.equal(tOverload.activeCubeMassKg, 5.0);
assert.equal(tOverload.level, 'red');
assert.equal(tOverload.isOverloaded, true);

console.log('✓ Cálculo de torque estático realista y sobrecarga validados.');
console.log('ALL_KINEMATICS_TESTS_PASSED');
