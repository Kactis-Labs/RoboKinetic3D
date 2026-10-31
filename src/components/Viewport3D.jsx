import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { degToRad } from '../kinematics';
import { PICK_ZONE, PLACE_ZONE } from '../hooks/usePickAndPlace';
import { Compass, Cpu, Play, CheckCircle2, Loader2 } from 'lucide-react';

export default function Viewport3D({
  theme,
  theta1Deg,
  theta2Deg,
  theta3Deg,
  l1,
  l2,
  hBase,
  telemetry,
  cameraViewTrigger,
  onSetCameraView,
  mobileTab = 'split',
  gripperAperture = 38,
  cubeLocation = 'pick',
  routineStatus = 'IDLE',
  statusMessage = '',
  currentStepIndex = 0,
  totalSteps = 10,
}) {
  const isDark = theme === 'dark';
  const [showDetails, setShowDetails] = useState(false);
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const gridRef = useRef(null);
  const xAxisLineRef = useRef(null);
  const yAxisLineRef = useRef(null);
  const spriteUpdaterRef = useRef(null);

  // Jerarquía cinemática del robot
  const robotRootRef = useRef(null);
  const turntableGroupRef = useRef(null);
  const shoulderPivotRef = useRef(null);
  const elbowPivotRef = useRef(null);
  const tcpMarkerRef = useRef(null);

  // Mallas estructurales que escalan con las longitudes
  const link1MeshRef = useRef(null);
  const link2MeshRef = useRef(null);

  // Efector final paramétrico (Mordazas y Cubo interactivo)
  const jawLeftRef = useRef(null);
  const jawRightRef = useRef(null);
  const cubeMeshRef = useRef(null);

  // Materiales para actualización de tema
  const materialsRef = useRef({});

  // Elementos de cota técnica y proyecciones
  const lineXRef = useRef(null);
  const lineYRef = useRef(null);
  const lineDropRef = useRef(null);
  const lineReachRef = useRef(null);
  const lineDirect3DRef = useRef(null);
  const groundTargetRef = useRef(null);
  const groundTriangleRef = useRef(null);

  // =========================================================================
  // 1. INICIALIZACIÓN DE LA ESCENA THREE.JS
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Escena principal
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // Cámara de perspectiva CAD calibrada para celda robótica de 3.2m
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.8, 4.6, 6.8);
    cameraRef.current = camera;

    // Renderizador WebGL de alta precisión
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controles orbitales de inspección espacial
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // No cruzar el suelo
    controls.minDistance = 1.5;
    controls.maxDistance = 22;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // Iluminación de Estudio CAD PBR
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(9, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6);
    fillLight.position.set(-8, 8, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
    rimLight.position.set(0, -2, 10);
    scene.add(rimLight);

    // Cuadrícula métrica técnica adaptada a celda robótica de 3.2m
    const grid = new THREE.GridHelper(10, 20);
    grid.position.y = 0.001;
    scene.add(grid);
    gridRef.current = grid;

    // Anillos concéntricos polares en el suelo (1m, 2m, 3m, 4m)
    const polarCirclesGroup = new THREE.Group();
    const radiusList = [1.0, 2.0, 3.0, 4.0];
    radiusList.forEach((radius) => {
      const circleGeo = new THREE.BufferGeometry();
      const points = [];
      const segments = 96;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0.002, -Math.sin(angle) * radius));
      }
      circleGeo.setFromPoints(points);
      const circleMat = new THREE.LineBasicMaterial({
        color: 0x2563eb,
        transparent: true,
        opacity: radius === 3.0 ? 0.35 : 0.16,
      });
      polarCirclesGroup.add(new THREE.Line(circleGeo, circleMat));
    });
    scene.add(polarCirclesGroup);

    // Rayos radiales a 0°, 45°, 90°, etc.
    const raysGroup = new THREE.Group();
    for (let deg = 0; deg < 360; deg += 45) {
      const rad = (deg * Math.PI) / 180;
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.002, 0),
        new THREE.Vector3(Math.cos(rad) * 4.5, 0.002, -Math.sin(rad) * 4.5),
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: deg === 45 ? 0.35 : 0.16,
      });
      raysGroup.add(new THREE.Line(rayGeo, rayMat));
    }
    scene.add(raysGroup);

    // Ejes ortogonales principales sobre el suelo (X: Verde esmeralda, Y: Índigo)
    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4.5, 0.003, 0),
      new THREE.Vector3(4.5, 0.003, 0),
    ]);
    const xAxisLine = new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({
      color: 0x047857,
      transparent: true,
      opacity: 0.85,
    }));
    scene.add(xAxisLine);
    xAxisLineRef.current = xAxisLine;

    const yAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.003, -4.5),
      new THREE.Vector3(0, 0.003, 4.5),
    ]);
    const yAxisLine = new THREE.Line(yAxisGeo, new THREE.LineBasicMaterial({
      color: 0x4338ca,
      transparent: true,
      opacity: 0.85,
    }));
    scene.add(yAxisLine);
    yAxisLineRef.current = yAxisLine;

    // Función constructora de placas de texto sutiles para los extremos de los ejes
    const createTextSprite = (text, textColor, isDarkTheme) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 56;
      const ctx = canvas.getContext('2d');

      // Fondo estilizado translúcido, nunca un bloque opaco que tape la escena
      ctx.fillStyle = isDarkTheme ? 'rgba(30, 41, 59, 0.82)' : 'rgba(255, 255, 255, 0.85)';
      if (ctx.roundRect) {
        ctx.roundRect(4, 4, 120, 48, 6);
      } else {
        ctx.rect(4, 4, 120, 48);
      }
      ctx.fill();

      ctx.strokeStyle = isDarkTheme ? '#475569' : '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 28);

      const texture = new THREE.CanvasTexture(canvas);
      // depthTest: true respeta las oclusiones tridimensionales para no flotar tapando objetos
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.36, 0.16, 1);
      return sprite;
    };

    const spriteGroup = new THREE.Group();
    const updateSprites = (dark) => {
      while (spriteGroup.children.length > 0) {
        spriteGroup.remove(spriteGroup.children[0]);
      }
      const xColor = dark ? '#34d399' : '#047857';
      const yColor = dark ? '#818cf8' : '#4338ca';

      const sX = createTextSprite('+X', xColor, dark);
      sX.position.set(4.65, 0.08, 0);
      spriteGroup.add(sX);

      const sMinusX = createTextSprite('-X', xColor, dark);
      sMinusX.position.set(-4.65, 0.08, 0);
      spriteGroup.add(sMinusX);

      const sY = createTextSprite('+Y', yColor, dark);
      sY.position.set(0, 0.08, -4.65);
      spriteGroup.add(sY);

      const sMinusY = createTextSprite('-Y', yColor, dark);
      sMinusY.position.set(0, 0.08, 4.65);
      spriteGroup.add(sMinusY);
    };
    updateSprites(isDark);
    scene.add(spriteGroup);
    spriteUpdaterRef.current = updateSprites;

    // =========================================================================
    // 2. CONSTRUCCIÓN DETALLADA DEL ROBOT ARTICULADO (PALETA INDUSTRIAL KUKA)
    // =========================================================================
    // Eslabones y estructura principal en Naranja KUKA característico (RAL 2004)
    const matArm1 = new THREE.MeshStandardMaterial({ color: 0xeb5b00, roughness: 0.28, metalness: 0.35 });
    const matArm2 = new THREE.MeshStandardMaterial({ color: 0xeb5b00, roughness: 0.28, metalness: 0.35 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.35, metalness: 0.8 }); // Grafito oscuro en refuerzos
    // Base y carcasas de fundición en grafito oscuro / antracita industrial
    const matBase = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.40, metalness: 0.70 });
    const matServoBody = new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.30, metalness: 0.85 });
    const matServoCap = new THREE.MeshStandardMaterial({ color: 0x3f4654, roughness: 0.25, metalness: 0.85 });
    const matServoHorn = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.30, metalness: 0.80 }); // Acero maquinado / titanio
    // Efector Final: Pinza / Gripper en Grafito Oscuro integral
    const matGripperBody = new THREE.MeshStandardMaterial({ color: 0x1c2028, roughness: 0.35, metalness: 0.85 }); // Carcasa grafito oscuro
    const matGripperAccent = new THREE.MeshStandardMaterial({ color: 0x272c35, roughness: 0.35, metalness: 0.80 }); // Mordazas en grafito
    const matGripperPad = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.90, metalness: 0.10 }); // Goma negra de fricción

    materialsRef.current = {
      matBase,
      matServoBody,
      matServoCap,
      matServoHorn,
      matArm1,
      matArm2,
      matAccent,
      matGripperBody,
      matGripperAccent,
      matGripperPad,
    };

    /**
     * Función generadora de Servomotores Físicos Robóticos
     * @param {string} labelName - Nombre para identificar el actuador
     * @param {number} length - Longitud del cuerpo del servo
     * @param {number} radius - Radio del cilindro/eje del servo
     * @param {boolean} isVertical - Orientación vertical u horizontal
     */
    const createServoModel = (labelName, length = 0.36, radius = 0.16, isVertical = false) => {
      const servoGroup = new THREE.Group();

      // Carcasa principal cilíndrica/prismática
      const bodyGeo = new THREE.CylinderGeometry(radius, radius, length, 28);
      if (!isVertical) bodyGeo.rotateZ(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, matServoBody);
      body.castShadow = true;
      body.receiveShadow = true;
      servoGroup.add(body);

      // Aletas de refrigeración o tapas de aleación en extremos
      const capGeo = new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, length * 0.18, 28);
      if (!isVertical) capGeo.rotateZ(Math.PI / 2);
      const cap1 = new THREE.Mesh(capGeo, matServoCap);
      const cap2 = new THREE.Mesh(capGeo, matServoCap);
      if (isVertical) {
        cap1.position.y = length * 0.42;
        cap2.position.y = -length * 0.42;
      } else {
        cap1.position.x = length * 0.42;
        cap2.position.x = -length * 0.42;
      }
      servoGroup.add(cap1);
      servoGroup.add(cap2);

      // Brida / Cuerno rotatorio con pernos (Servo Horn)
      const hornGeo = new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, 0.05, 24);
      if (!isVertical) hornGeo.rotateZ(Math.PI / 2);
      const horn = new THREE.Mesh(hornGeo, matServoHorn);
      if (isVertical) {
        horn.position.y = length * 0.52;
      } else {
        horn.position.x = length * 0.52;
      }
      servoGroup.add(horn);

      // Detalles de pernos perimetrales en la brida
      const boltCount = 6;
      for (let i = 0; i < boltCount; i++) {
        const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8);
        const bolt = new THREE.Mesh(boltGeo, matServoCap);
        const ang = (i / boltCount) * Math.PI * 2;
        const bRad = radius * 0.58;
        if (isVertical) {
          bolt.position.set(Math.cos(ang) * bRad, length * 0.55, Math.sin(ang) * bRad);
        } else {
          bolt.position.set(length * 0.55, Math.cos(ang) * bRad, Math.sin(ang) * bRad);
          bolt.rotateZ(Math.PI / 2);
        }
        servoGroup.add(bolt);
      }

      return servoGroup;
    };

    // A) Base Fija al suelo (Pedestal con anclajes)
    const basePedestal = new THREE.Group();
    const pedestalGeo = new THREE.CylinderGeometry(0.75, 0.88, 0.22, 36);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, matBase);
    pedestalMesh.position.y = 0.11;
    pedestalMesh.castShadow = true;
    pedestalMesh.receiveShadow = true;
    basePedestal.add(pedestalMesh);

    // Servomotor J1 (Base - Vertical)
    const servoJ1 = createServoModel('J1_BASE', 0.28, 0.32, true);
    servoJ1.position.y = 0.26;
    basePedestal.add(servoJ1);

    scene.add(basePedestal);
    robotRootRef.current = basePedestal;

    // B) Torreta Giratoria (J1 Yaw: rota en Y según theta1)
    const turntableGroup = new THREE.Group();
    turntableGroup.position.y = 0.38;
    scene.add(turntableGroup);
    turntableGroupRef.current = turntableGroup;

    // Plato giratorio superior
    const turntableGeo = new THREE.CylinderGeometry(0.52, 0.56, 0.12, 36);
    const turntableMesh = new THREE.Mesh(turntableGeo, matServoCap);
    turntableMesh.position.y = 0.06;
    turntableMesh.castShadow = true;
    turntableGroup.add(turntableMesh);

    // Orejetas verticales de soporte del hombro (Twin Brackets en Naranja KUKA)
    const bracketWidth = 0.12;
    const bracketHeight = 0.24;
    const bracketGeo = new THREE.BoxGeometry(0.32, bracketHeight, bracketWidth);
    const bracketLeft = new THREE.Mesh(bracketGeo, matArm1);
    bracketLeft.position.set(0, bracketHeight * 0.5, 0.24);
    bracketLeft.castShadow = true;
    turntableGroup.add(bracketLeft);

    const bracketRight = new THREE.Mesh(bracketGeo, matArm1);
    bracketRight.position.set(0, bracketHeight * 0.5, -0.24);
    bracketRight.castShadow = true;
    turntableGroup.add(bracketRight);

    // Servomotor J2 (Hombro - Montado horizontalmente entre las orejetas)
    const servoJ2 = createServoModel('J2_SHOULDER', 0.44, 0.18, false);
    servoJ2.position.set(0, 0.22, 0); // Eje a altura hBase = 0.60m desde el suelo (0.38 + 0.22 = 0.60m)
    turntableGroup.add(servoJ2);

    // C) PIVOTE DEL HOMBRO (J2 Pitch: rota en Z local según theta2)
    // El eje del hombro se ubica exactamente a altura hBase (0.60m desde el suelo)
    // Dentro de turntableGroup (Y=0.38), hBase corresponde a 0.60 - 0.38 = 0.22m
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(0, 0.22, 0); // Coincide exactamente con hBase y el eje del servo J2
    turntableGroup.add(shoulderPivot);
    shoulderPivotRef.current = shoulderPivot;

    // Disco de acople del hombro al eslabón 1
    const shoulderDiscGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 28);
    shoulderDiscGeo.rotateZ(Math.PI / 2);
    const shoulderDisc = new THREE.Mesh(shoulderDiscGeo, matServoHorn);
    shoulderPivot.add(shoulderDisc);

    // Eslabón 1 (Brazo / Húmero - Longitud L1)
    // Orientado a lo largo del eje local X
    const link1Group = new THREE.Group();
    shoulderPivot.add(link1Group);

    // Viga principal doble tubo de aleación
    const tubeGeo = new THREE.CylinderGeometry(0.065, 0.065, 1, 24);
    tubeGeo.rotateZ(-Math.PI / 2);
    tubeGeo.translate(0.5, 0, 0);

    const tube1 = new THREE.Mesh(tubeGeo, matArm1);
    tube1.position.z = 0.09;
    tube1.castShadow = true;
    link1Group.add(tube1);

    const tube2 = new THREE.Mesh(tubeGeo, matArm1);
    tube2.position.z = -0.09;
    tube2.castShadow = true;
    link1Group.add(tube2);

    // Refuerzos transversales en el eslabón 1
    const crossBarGeo = new THREE.BoxGeometry(0.04, 0.08, 0.22);
    const crossBar1 = new THREE.Mesh(crossBarGeo, matAccent);
    crossBar1.position.x = 0.35;
    link1Group.add(crossBar1);
    const crossBar2 = new THREE.Mesh(crossBarGeo, matAccent);
    crossBar2.position.x = 0.7;
    link1Group.add(crossBar2);

    link1MeshRef.current = link1Group;

    // D) PIVOTE DEL CODO (J3 Pitch: rota en Z local según theta3)
    // Ubicado al final del eslabón 1 (en X = L1)
    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(1.8, 0, 0); // Se ajusta dinámicamente con L1
    shoulderPivot.add(elbowPivot);
    elbowPivotRef.current = elbowPivot;

    // Servomotor J3 (Codo - Integrado en el extremo de L1)
    const servoJ3 = createServoModel('J3_ELBOW', 0.38, 0.15, false);
    elbowPivot.add(servoJ3);

    // Eslabón 2 (Antebrazo - Longitud L2)
    // Orientado a lo largo del eje local X
    const link2Group = new THREE.Group();
    elbowPivot.add(link2Group);

    const link2TubeGeo = new THREE.CylinderGeometry(0.05, 0.06, 1, 24);
    link2TubeGeo.rotateZ(-Math.PI / 2);
    link2TubeGeo.translate(0.5, 0, 0);
    const link2Tube = new THREE.Mesh(link2TubeGeo, matArm2);
    link2Tube.castShadow = true;
    link2Group.add(link2Tube);

    link2MeshRef.current = link2Group;

    // E) Efector Final Industrial: Gripper Robótico Articulado de 2 Dedos (Montaje Lineal en Antebrazo)
    // Montado longitudinalmente al final de L2 en prolongación natural del antebrazo.
    // El Tool Center Point (TCP) se ubica exactamente en la cota cinemática L2.
    const tcpGroup = new THREE.Group();
    tcpGroup.position.set(1.0, 0, 0); // Se ajusta dinámicamente con L2 (en L2 - 0.55)
    elbowPivot.add(tcpGroup);
    tcpMarkerRef.current = tcpGroup;

    // 1. Brida de Muñeca (Flange de acople ISO en aleación pulida)
    const wristFlangeGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.08, 32);
    wristFlangeGeo.rotateZ(Math.PI / 2);
    const wristFlange = new THREE.Mesh(wristFlangeGeo, matServoCap);
    wristFlange.position.set(0.04, 0, 0);
    wristFlange.castShadow = true;
    tcpGroup.add(wristFlange);

    // Pernos perimetrales en la brida de la muñeca
    const boltCircleRadius = 0.15;
    for (let b = 0; b < 6; b++) {
      const bAng = (b / 6) * Math.PI * 2;
      const boltMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8),
        matServoHorn
      );
      boltMesh.rotateZ(Math.PI / 2);
      boltMesh.position.set(0.04, Math.sin(bAng) * boltCircleRadius, Math.cos(bAng) * boltCircleRadius);
      tcpGroup.add(boltMesh);
    }

    // 2. Carcasa Principal del Gripper (Grafito Oscuro y Azul Cobalto Mecanizado)
    const gripperBaseGroup = new THREE.Group();
    tcpGroup.add(gripperBaseGroup);

    // Cuello de montaje cónico
    const neckGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.08, 28);
    neckGeo.rotateZ(Math.PI / 2);
    const neckMesh = new THREE.Mesh(neckGeo, matGripperBody);
    neckMesh.position.set(0.12, 0, 0);
    neckMesh.castShadow = true;
    gripperBaseGroup.add(neckMesh);

    // Bloque central del actuador (ancho y robusto para abarcar el cubo)
    const bodyActuatorGeo = new THREE.BoxGeometry(0.20, 0.24, 0.56);
    const bodyActuator = new THREE.Mesh(bodyActuatorGeo, matGripperBody);
    bodyActuator.position.set(0.22, 0, 0);
    bodyActuator.castShadow = true;
    gripperBaseGroup.add(bodyActuator);

    // Placa frontal maquinada de sujeción (tapa frontal metálica)
    const frontPlateGeo = new THREE.BoxGeometry(0.03, 0.22, 0.52);
    const frontPlate = new THREE.Mesh(frontPlateGeo, matServoCap);
    frontPlate.position.set(0.32, 0, 0);
    gripperBaseGroup.add(frontPlate);

    // 4 pernos frontales en la tapa
    const frontBolts = [
      [-0.075, -0.19],
      [-0.075, 0.19],
      [0.075, -0.19],
      [0.075, 0.19],
    ];
    frontBolts.forEach(([by, bz]) => {
      const fb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8),
        matServoHorn
      );
      fb.rotateZ(Math.PI / 2);
      fb.position.set(0.335, by, bz);
      gripperBaseGroup.add(fb);
    });

    /**
     * Función constructora de Dedo Articulado Industrial (con garras envolventes que abrazan el cubo)
     * @param {boolean} isLeft - Si es dedo izquierdo (+Z) o derecho (-Z)
     */
    const createArticulatedFinger = (isLeft) => {
      const fingerRoot = new THREE.Group();
      // Pivote base espaciado lateralmente en la carcasa (Z = +-0.26)
      const zSign = isLeft ? 1 : -1;
      fingerRoot.position.set(0.28, 0, zSign * 0.26);

      // Pasador del pivote base (bulón de acero pulido)
      const pinBaseGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.09, 16);
      const pinBase = new THREE.Mesh(pinBaseGeo, matServoHorn);
      fingerRoot.add(pinBase);

      // --- Falange Proximal ---
      const proximalGroup = new THREE.Group();
      fingerRoot.add(proximalGroup);

      // Viga superior angulada hacia el frente (Azul Cobalto Industrial)
      const upperBarGeo = new THREE.BoxGeometry(0.18, 0.065, 0.04);
      const upperBar = new THREE.Mesh(upperBarGeo, matGripperAccent);
      upperBar.position.set(0.08, 0.045, -zSign * 0.01);
      upperBar.rotation.z = 0.06;
      upperBar.castShadow = true;
      proximalGroup.add(upperBar);

      // Viga inferior con refuerzo estructural
      const lowerBarGeo = new THREE.BoxGeometry(0.17, 0.055, 0.04);
      const lowerBar = new THREE.Mesh(lowerBarGeo, matGripperAccent);
      lowerBar.position.set(0.07, -0.045, -zSign * 0.01);
      lowerBar.rotation.z = -0.05;
      lowerBar.castShadow = true;
      proximalGroup.add(lowerBar);

      // Nudillo de articulación intermedia (codo del dedo en grafito maquinado)
      const knuckleGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16);
      const knuckle = new THREE.Mesh(knuckleGeo, matGripperBody);
      knuckle.position.set(0.16, 0, -zSign * 0.02);
      knuckle.castShadow = true;
      proximalGroup.add(knuckle);

      // --- Falange Distal / Mandíbula de Agarre Envolvente ---
      // Se articula en el nudillo (local X = 0.16)
      const clawGroup = new THREE.Group();
      clawGroup.position.set(0.16, 0, -zSign * 0.02);
      proximalGroup.add(clawGroup);

      // Cuerpo longitudinal de la garra (largo para envolver el cubo en toda su profundidad)
      const jawBodyGeo = new THREE.BoxGeometry(0.26, 0.095, 0.045);
      const jawBody = new THREE.Mesh(jawBodyGeo, matGripperAccent);
      jawBody.position.set(0.13, 0, 0);
      jawBody.castShadow = true;
      clawGroup.add(jawBody);

      // Punta enganchada hacia el interior que envuelve la esquina frontal del cubo
      const hookGeo = new THREE.BoxGeometry(0.06, 0.09, 0.055);
      const hook = new THREE.Mesh(hookGeo, matGripperAccent);
      hook.position.set(0.25, 0, -zSign * 0.035);
      hook.rotation.y = -zSign * 0.45;
      hook.castShadow = true;
      clawGroup.add(hook);

      // Almohadilla interna de fricción (contacto plano de 22 cm a lo largo de la cara del cubo)
      // Situada de forma que a 29mm la distancia entre caras internas es de 0.32m exactos
      const padLength = 0.22;
      const padMesh = new THREE.Mesh(
        new THREE.BoxGeometry(padLength, 0.088, 0.022),
        matGripperPad
      );
      padMesh.position.set(0.11, 0, -zSign * 0.069);
      clawGroup.add(padMesh);

      // Dientes / estrías transversales maquinadas de alta fricción
      const toothCount = 7;
      for (let t = 0; t < toothCount; t++) {
        const toothX = 0.01 + (t / (toothCount - 1)) * 0.20;
        const toothMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.014, 0.078, 0.012),
          matServoCap
        );
        toothMesh.position.set(toothX, 0, -zSign * 0.078);
        clawGroup.add(toothMesh);
      }

      return {
        fingerRoot,
        proximalGroup,
        clawGroup,
      };
    };

    // Crear dedo izquierdo (+Z) y derecho (-Z)
    const fingerLeftObj = createArticulatedFinger(true);
    tcpGroup.add(fingerLeftObj.fingerRoot);
    jawLeftRef.current = fingerLeftObj.fingerRoot;

    const fingerRightObj = createArticulatedFinger(false);
    tcpGroup.add(fingerRightObj.fingerRoot);
    jawRightRef.current = fingerRightObj.fingerRoot;

    // Marcador visual centrado del punto de agarre (TCP) exacto (en X = 0.55)
    const tcpSphereGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const tcpSphereMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const tcpSphere = new THREE.Mesh(tcpSphereGeo, tcpSphereMat);
    tcpSphere.position.set(0.55, 0, 0); // Exacto centro de agarre entre las almohadillas
    tcpGroup.add(tcpSphere);

    // =========================================================================
    // 2.5. ENTORNO INTERACTIVO INDUSTRIAL: ZONAS EN EL SUELO Y CUBO MÉTRICO
    // =========================================================================
    /**
     * Generador de textura serigrafiada para la diana del suelo (Plano, sin cuadros blancos flotantes)
     */
    /**
     * Generador de textura para demarcación industrial del suelo (Realista, sobria, sin neones Tron)
     */
    const createFloorZoneCanvasTexture = (zoneText, subText, accentColorHexStr) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, 512, 512);

      // 1. Placa circular base en gris industrial mate
      ctx.beginPath();
      ctx.arc(256, 256, 236, 0, Math.PI * 2);
      ctx.fillStyle = '#1e242d';
      ctx.fill();

      // 2. Anillo perimetral técnico de delimitación
      ctx.beginPath();
      ctx.arc(256, 256, 230, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = accentColorHexStr;
      ctx.stroke();

      // 3. Círculo interior fino de referencia
      ctx.beginPath();
      ctx.arc(256, 256, 185, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      // 4. Marcadores de esquina de asentamiento de pieza (Workpiece Docking Brackets)
      const halfBox = 75;
      const bracketLen = 26;
      const left = 256 - halfBox;
      const right = 256 + halfBox;
      const top = 256 - halfBox;
      const bottom = 256 + halfBox;

      ctx.lineWidth = 4;
      ctx.strokeStyle = accentColorHexStr;
      ctx.lineCap = 'square';

      // Esquina Sup-Izq
      ctx.beginPath();
      ctx.moveTo(left, top + bracketLen);
      ctx.lineTo(left, top);
      ctx.lineTo(left + bracketLen, top);
      ctx.stroke();

      // Esquina Sup-Der
      ctx.beginPath();
      ctx.moveTo(right - bracketLen, top);
      ctx.lineTo(right, top);
      ctx.lineTo(right, top + bracketLen);
      ctx.stroke();

      // Esquina Inf-Izq
      ctx.beginPath();
      ctx.moveTo(left, bottom - bracketLen);
      ctx.lineTo(left, bottom);
      ctx.lineTo(left + bracketLen, bottom);
      ctx.stroke();

      // Esquina Inf-Der
      ctx.beginPath();
      ctx.moveTo(right - bracketLen, bottom);
      ctx.lineTo(right, bottom);
      ctx.lineTo(right, bottom - bracketLen);
      ctx.stroke();

      // 5. Cruz central técnica
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(256 - 14, 256);
      ctx.lineTo(256 + 14, 256);
      ctx.moveTo(256, 256 - 14);
      ctx.lineTo(256, 256 + 14);
      ctx.stroke();

      // 6. Rótulos industriales limpios
      ctx.font = 'bold 30px "JetBrains Mono", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zoneText, 256, 305);

      ctx.font = '600 15px "JetBrains Mono", sans-serif';
      ctx.fillStyle = accentColorHexStr;
      ctx.fillText(subText, 256, 335);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      return texture;
    };

    // Helper para crear plataformas de zonas de trabajo integradas al suelo
    const createWorkZonePlatform = (zone, labelText, subText, colorStr) => {
      const zoneGroup = new THREE.Group();
      zoneGroup.position.set(zone.x, 0.005, -zone.y);

      // Disco metálico plano en el suelo (1.4m de diámetro) con acabado acero maquinado
      const discGeo = new THREE.CylinderGeometry(0.65, 0.70, 0.018, 40);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x242b35,
        roughness: 0.45,
        metalness: 0.65,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.y = 0.009;
      disc.receiveShadow = true;
      zoneGroup.add(disc);

      // Gráfico técnico plano sobre la superficie del disco
      const floorPlaneGeo = new THREE.PlaneGeometry(1.20, 1.20);
      floorPlaneGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshBasicMaterial({
        map: createFloorZoneCanvasTexture(labelText, subText, colorStr),
        transparent: true,
        depthWrite: false,
      });
      const floorGraphic = new THREE.Mesh(floorPlaneGeo, floorMat);
      floorGraphic.position.y = 0.019;
      zoneGroup.add(floorGraphic);

      scene.add(zoneGroup);
      return zoneGroup;
    };

    createWorkZonePlatform(PICK_ZONE, 'ZONA PICK', 'CARGA', '#d97706');
    createWorkZonePlatform(PLACE_ZONE, 'ZONA PLACE', 'DESCARGA', '#2563eb');

    // Cubo Métrico Interactivo de 32x32x32 cm (Aluminio bruñido PBR grande, vistoso y bien visible)
    const cubeGroup = new THREE.Group();
    const cubeSize = 0.32; // Tamaño industrial robusto y proporcionado
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9,
    });
    const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    cubeMesh.castShadow = true;
    cubeMesh.receiveShadow = true;
    cubeGroup.add(cubeMesh);

    // Aristas visibles de contraste CAD en azul metálico
    const edgesGeo = new THREE.EdgesGeometry(cubeGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2.5 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    cubeGroup.add(edges);

    // Ubicación inicial en reposo en la Zona Pick sobre el pedestal (altura 0.18m)
    // El cubo reposa plano y orientado armónicamente con la pinza
    const thetaPickInit = Math.atan2(PICK_ZONE.y, PICK_ZONE.x);
    cubeGroup.position.set(PICK_ZONE.x, cubeSize / 2 + 0.02, -PICK_ZONE.y);
    cubeGroup.rotation.set(0, -thetaPickInit, 0);
    scene.add(cubeGroup);
    cubeMeshRef.current = cubeGroup;

    // =========================================================================
    // 3. COTAS TÉCNICAS Y LÍNEAS DE PROYECCIÓN ORTOGONAL EN EL ESPACIO
    // =========================================================================
    // Línea de Cota X sobre el suelo
    const lineXGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const lineXMat = new THREE.LineDashedMaterial({ color: 0x047857, dashSize: 0.14, gapSize: 0.08 });
    const lineX = new THREE.Line(lineXGeo, lineXMat);
    scene.add(lineX);
    lineXRef.current = lineX;

    // Línea de Cota Y sobre el suelo
    const lineYGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)]);
    const lineYMat = new THREE.LineDashedMaterial({ color: 0x4338ca, dashSize: 0.14, gapSize: 0.08 });
    const lineY = new THREE.Line(lineYGeo, lineYMat);
    scene.add(lineY);
    lineYRef.current = lineY;

    // Línea de cota horizontal (Radio r_xy) en el suelo desde el origen
    const lineReachGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const lineReachMat = new THREE.LineDashedMaterial({ color: 0x2563eb, dashSize: 0.18, gapSize: 0.1 });
    const lineReach = new THREE.Line(lineReachGeo, lineReachMat);
    scene.add(lineReach);
    lineReachRef.current = lineReach;

    // Línea de caída vertical (Cota Z) desde el TCP hasta el suelo
    const lineDropGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0)]);
    const lineDropMat = new THREE.LineDashedMaterial({ color: 0x2563eb, dashSize: 0.1, gapSize: 0.06 });
    const lineDrop = new THREE.Line(lineDropGeo, lineDropMat);
    scene.add(lineDrop);
    lineDropRef.current = lineDrop;

    // Vector 3D directo desde el hombro hasta el TCP (distancia esférica rho)
    const lineDirect3DGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(1, 1, 0)]);
    const lineDirect3DMat = new THREE.LineDashedMaterial({ color: 0xd97706, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: 0.65 });
    const lineDirect3D = new THREE.Line(lineDirect3DGeo, lineDirect3DMat);
    scene.add(lineDirect3D);
    lineDirect3DRef.current = lineDirect3D;

    // Anillo Diana en el suelo en la proyección (X, Y, 0)
    const groundTargetGeo = new THREE.RingGeometry(0.08, 0.18, 32);
    groundTargetGeo.rotateX(-Math.PI / 2);
    const groundTargetMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide });
    const groundTarget = new THREE.Mesh(groundTargetGeo, groundTargetMat);
    groundTarget.position.y = 0.005;
    scene.add(groundTarget);
    groundTargetRef.current = groundTarget;

    // Triángulo ortogonal sombreado sobre la mesa
    const groundTriangleGeo = new THREE.BufferGeometry();
    const groundTriangleMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    });
    const groundTriangle = new THREE.Mesh(groundTriangleGeo, groundTriangleMat);
    groundTriangle.position.y = 0.004;
    scene.add(groundTriangle);
    groundTriangleRef.current = groundTriangle;

    // =========================================================================
    // 4. BUCLE DE RENDERIZADO Y RESIZE
    // =========================================================================
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth <= 0 || newHeight <= 0) return;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // =========================================================================
  // 5. ACTUALIZACIÓN DINÁMICA DE TEMA (CLARO / OSCURO)
  // =========================================================================
  useEffect(() => {
    if (!sceneRef.current || !gridRef.current) return;

    if (isDark) {
      sceneRef.current.background = new THREE.Color(0x0f172a);
      gridRef.current.material.color.setHex(0x334155);
      gridRef.current.material.opacity = 0.5;
      gridRef.current.material.transparent = true;

      if (xAxisLineRef.current) xAxisLineRef.current.material.color.setHex(0x34d399);
      if (yAxisLineRef.current) yAxisLineRef.current.material.color.setHex(0x818cf8);
      if (lineXRef.current) lineXRef.current.material.color.setHex(0x34d399);
      if (lineYRef.current) lineYRef.current.material.color.setHex(0x818cf8);
      if (lineReachRef.current) lineReachRef.current.material.color.setHex(0x60a5fa);
      if (lineDropRef.current) lineDropRef.current.material.color.setHex(0x60a5fa);
      if (lineDirect3DRef.current) lineDirect3DRef.current.material.color.setHex(0xfbbf24);
      if (groundTargetRef.current) groundTargetRef.current.material.color.setHex(0x60a5fa);
      if (groundTriangleRef.current) {
        groundTriangleRef.current.material.color.setHex(0x3b82f6);
        groundTriangleRef.current.material.opacity = 0.16;
      }

      if (materialsRef.current.matBase) materialsRef.current.matBase.color.setHex(0x1f242d);
      if (materialsRef.current.matArm1) materialsRef.current.matArm1.color.setHex(0xeb5b00);
      if (materialsRef.current.matArm2) materialsRef.current.matArm2.color.setHex(0xeb5b00);
      if (materialsRef.current.matGripperBody) materialsRef.current.matGripperBody.color.setHex(0x1c2028);
      if (materialsRef.current.matGripperAccent) materialsRef.current.matGripperAccent.color.setHex(0x272c35);
    } else {
      sceneRef.current.background = new THREE.Color(0xdce5ed);
      gridRef.current.material.color.setHex(0x94a3b8);
      gridRef.current.material.opacity = 0.65;
      gridRef.current.material.transparent = true;

      if (xAxisLineRef.current) xAxisLineRef.current.material.color.setHex(0x047857);
      if (yAxisLineRef.current) yAxisLineRef.current.material.color.setHex(0x4338ca);
      if (lineXRef.current) lineXRef.current.material.color.setHex(0x047857);
      if (lineYRef.current) lineYRef.current.material.color.setHex(0x4338ca);
      if (lineReachRef.current) lineReachRef.current.material.color.setHex(0x2563eb);
      if (lineDropRef.current) lineDropRef.current.material.color.setHex(0x2563eb);
      if (lineDirect3DRef.current) lineDirect3DRef.current.material.color.setHex(0xd97706);
      if (groundTargetRef.current) groundTargetRef.current.material.color.setHex(0x2563eb);
      if (groundTriangleRef.current) {
        groundTriangleRef.current.material.color.setHex(0x2563eb);
        groundTriangleRef.current.material.opacity = 0.14;
      }

      if (materialsRef.current.matBase) materialsRef.current.matBase.color.setHex(0x334155);
      if (materialsRef.current.matArm1) materialsRef.current.matArm1.color.setHex(0xeb5b00);
      if (materialsRef.current.matArm2) materialsRef.current.matArm2.color.setHex(0xeb5b00);
      if (materialsRef.current.matGripperBody) materialsRef.current.matGripperBody.color.setHex(0x272c35);
      if (materialsRef.current.matGripperAccent) materialsRef.current.matGripperAccent.color.setHex(0x333b47);
    }

    if (spriteUpdaterRef.current) {
      spriteUpdaterRef.current(isDark);
    }
  }, [isDark]);

  // =========================================================================
  // 6. ACTUALIZACIÓN CINEMÁTICA EN TIEMPO REAL (ÁNGULOS, ESCALAS Y COTAS)
  // =========================================================================
  useEffect(() => {
    if (
      !turntableGroupRef.current ||
      !shoulderPivotRef.current ||
      !elbowPivotRef.current ||
      !link1MeshRef.current ||
      !link2MeshRef.current ||
      !tcpMarkerRef.current
    )
      return;

    const t1Rad = degToRad(theta1Deg);
    const t2Rad = degToRad(theta2Deg);
    const t3Rad = degToRad(theta3Deg);

    // 1. Rotación del Servomotor J1 (Base - Yaw horizontal)
    // En Three.js rotamos turntableGroup en Y
    turntableGroupRef.current.rotation.y = t1Rad;

    // 2. Rotación del Servomotor J2 (Hombro - Pitch vertical)
    // El hombro rota en su eje transversal local (Z)
    // t2Rad = 0 => horizontal, t2Rad = 90° => vertical
    shoulderPivotRef.current.rotation.z = t2Rad;

    // Escalar la longitud del eslabón 1 (L1)
    link1MeshRef.current.scale.set(l1, 1, 1);

    // Posicionar el pivote del Codo al final del eslabón 1 (X = L1)
    elbowPivotRef.current.position.set(l1, 0, 0);

    // 3. Rotación del Servomotor J3 (Codo - Pitch relativo)
    // El codo rota en su eje transversal local (Z) respecto al eslabón 1
    elbowPivotRef.current.rotation.z = t3Rad;

    // Escalar la longitud del eslabón 2 (L2) hasta la brida en L2 - 0.55
    link2MeshRef.current.scale.set(Math.max(0.2, l2 - 0.55), 1, 1);

    // Posicionar el efector final en la muñeca (X = L2 - 0.55) en prolongación natural del antebrazo
    tcpMarkerRef.current.position.set(Math.max(0.2, l2 - 0.55), 0, 0);
    tcpMarkerRef.current.rotation.set(0, 0, 0); // Orientación lineal y continua con el antebrazo

    // Coordenadas cartesianas espaciales calculadas del TCP (en la punta entre las mordazas)
    const x = telemetry.direct.xRaw;
    const yDepth = -telemetry.direct.yRaw; // Profundidad en Three.js (-Z)
    const zHeight = telemetry.direct.zRaw; // Altura en Three.js (+Y)

    // A) Cota X (sobre el suelo, desde el eje hasta el punto X)
    if (lineXRef.current) {
      lineXRef.current.geometry.setFromPoints([
        new THREE.Vector3(x, 0.005, 0),
        new THREE.Vector3(x, 0.005, yDepth),
      ]);
      lineXRef.current.computeLineDistances();
    }

    // B) Cota Y (sobre el suelo, desde el eje hasta el punto Y)
    if (lineYRef.current) {
      lineYRef.current.geometry.setFromPoints([
        new THREE.Vector3(0, 0.005, yDepth),
        new THREE.Vector3(x, 0.005, yDepth),
      ]);
      lineYRef.current.computeLineDistances();
    }

    // C) Línea radial de alcance en el suelo r_xy
    if (lineReachRef.current) {
      lineReachRef.current.geometry.setFromPoints([
        new THREE.Vector3(0, 0.005, 0),
        new THREE.Vector3(x, 0.005, yDepth),
      ]);
      lineReachRef.current.computeLineDistances();
    }

    // D) Triángulo ortogonal plano X-Y en el suelo
    if (groundTriangleRef.current) {
      const vertices = new Float32Array([
        0, 0.004, 0,
        x, 0.004, 0,
        x, 0.004, yDepth,
      ]);
      groundTriangleRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      groundTriangleRef.current.geometry.computeVertexNormals();
    }

    // E) Línea de caída de cota de elevación Z (desde el TCP en el aire hasta el suelo)
    if (lineDropRef.current) {
      lineDropRef.current.geometry.setFromPoints([
        new THREE.Vector3(x, zHeight, yDepth),
        new THREE.Vector3(x, 0.005, yDepth),
      ]);
      lineDropRef.current.computeLineDistances();
    }

    // F) Vector 3D directo hombro -> TCP (distancia rho)
    if (lineDirect3DRef.current) {
      lineDirect3DRef.current.geometry.setFromPoints([
        new THREE.Vector3(0, hBase, 0),
        new THREE.Vector3(x, zHeight, yDepth),
      ]);
      lineDirect3DRef.current.computeLineDistances();
    }

    // G) Diana / Retícula del efector proyectada en el suelo
    if (groundTargetRef.current) {
      groundTargetRef.current.position.set(x, 0.005, yDepth);
    }

    // G) Diana en el suelo en la proyección (X, Y)
    if (groundTargetRef.current) {
      groundTargetRef.current.position.set(x, 0.005, yDepth);
    }
  }, [theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase, telemetry]);

  // =========================================================================
  // 6.5. APERTURA PARAMÉTRICA DE LA PINZA (GRIPPER ARTICULADO)
  // =========================================================================
  useEffect(() => {
    if (!jawLeftRef.current || !jawRightRef.current) return;
    // Apertura angular de los dedos estilo industrial:
    // A 0 mm: dedos suavemente cerrados (sin cruzarse bruscamente)
    // A 14 mm: reposo neutro relajado (postura inicial equilibrada)
    // A 29 mm: dedos paralelos sujetando y abrazando firmemente las caras del cubo de 32 cm
    // A 38-40 mm: dedos abiertos con holgura (~43-45 cm) para aproximación/liberación sin colisiones
    const openAngle =
      gripperAperture >= 29
        ? ((gripperAperture - 29) / 11) * 0.20
        : ((gripperAperture - 29) / 29) * 0.28;
    jawLeftRef.current.rotation.y = -openAngle;
    jawRightRef.current.rotation.y = openAngle;
  }, [gripperAperture]);

  // =========================================================================
  // 6.6. GESTIÓN Y VINCULACIÓN 3D DEL CUBO MÉTRICO (PARENTING SEAMLESS)
  // =========================================================================
  useEffect(() => {
    if (!cubeMeshRef.current || !sceneRef.current || !tcpMarkerRef.current) return;
    const cube = cubeMeshRef.current;
    const cubeSize = 0.32;
    const cubeCenterHeight = cubeSize / 2 + 0.02; // Altura exacta del centro: 0.18 m
    const thetaPick = Math.atan2(PICK_ZONE.y, PICK_ZONE.x);
    const thetaPlace = Math.atan2(PLACE_ZONE.y, PLACE_ZONE.x);

    if (cubeLocation === 'gripped') {
      // Estado Sujeto: attach() vincula el cubo preservando su postura exacta del suelo.
      // El cubo no salta ni se teletransporta: mantiene su posición de reposo y, a medida que el brazo
      // se eleva y traslada por el espacio, el cubo rota rígidamente con la pinza de forma realista.
      if (cube.parent !== tcpMarkerRef.current) {
        tcpMarkerRef.current.attach(cube);
      }
    } else if (cubeLocation === 'place') {
      // Estado Depositado en Zona Place: se desvincula en la mesa conservando su orientación plana en la diana
      if (cube.parent !== sceneRef.current) {
        sceneRef.current.attach(cube);
        cube.position.set(PLACE_ZONE.x, cubeCenterHeight, -PLACE_ZONE.y);
        cube.rotation.set(0, -thetaPlace, 0);
      }
    } else {
      // Estado En reposo en Zona Pick / Reset
      if (cube.parent !== sceneRef.current) {
        sceneRef.current.attach(cube);
      }
      cube.position.set(PICK_ZONE.x, cubeCenterHeight, -PICK_ZONE.y);
      cube.rotation.set(0, -thetaPick, 0);
    }
  }, [cubeLocation]);

  // =========================================================================
  // 7. RESPUESTA A CAMBIO DE VISTA DE CÁMARA (CALIBRADA PARA CELDA DE 3.2M)
  // =========================================================================
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !cameraViewTrigger) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (cameraViewTrigger.view) {
      case 'top':
        camera.position.set(0, 10.5, 0.001);
        controls.target.set(0, 0, 0);
        break;
      case 'front':
        camera.position.set(0, 1.8, 9.2);
        controls.target.set(0, 0.8, 0);
        break;
      case 'side':
        camera.position.set(9.2, 1.8, 0.001);
        controls.target.set(0, 0.8, 0);
        break;
      case 'isometric':
      default:
        camera.position.set(5.8, 4.6, 6.8);
        controls.target.set(0, 0.8, 0);
        break;
    }
    controls.update();
  }, [cameraViewTrigger]);

  return (
    <div
      className={`relative ${
        mobileTab === 'split'
          ? 'h-[40vh] sm:h-[45vh] w-full shrink-0 border-b border-[#334155]/60 order-first md:order-none'
          : mobileTab === '3d'
          ? 'flex-1 h-full w-full'
          : 'hidden md:block'
      } md:flex-1 md:h-full md:w-full md:border-b-0 overflow-hidden transition-colors ${
        isDark ? 'bg-[#0f172a]' : 'bg-[#dce5ed]'
      }`}
    >
      {/* Canvas Three.js */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Indicador Flotante Superior: Mini Panel Resumen */}
      {/* 1. Versión Móvil: Compacta */}
      <div className="md:hidden absolute top-2.5 left-2.5 z-10 select-none max-w-[calc(100vw-20px)]">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border shadow-sm backdrop-blur-md text-[10px] font-math ${
            isDark
              ? 'bg-[#182234]/95 border-[#334155] text-[#f8fafc]'
              : 'bg-[#ffffff]/95 border-[#cbd5e1] text-[#0f172a]'
          }`}
        >
          <span className="font-sans font-semibold text-[#ea580c]">Coord:</span>
          <span className={`font-bold ${isDark ? 'text-[#34d399]' : 'text-[#047857]'}`}>
            X:{telemetry.direct.resultX}
          </span>
          <span className={`font-bold ${isDark ? 'text-[#818cf8]' : 'text-[#4338ca]'}`}>
            Y:{telemetry.direct.resultY}
          </span>
          <span className={`font-bold ${isDark ? 'text-[#fbbf24]' : 'text-[#b45309]'}`}>
            Z:{telemetry.direct.resultZ}
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-sans text-[9px] text-slate-400">Ángulos:</span>
          <span className="font-mono text-[9px] font-semibold">
            {Number(theta1Deg).toFixed(0)}°·{Number(theta2Deg).toFixed(0)}°·{Number(theta3Deg).toFixed(0)}°
          </span>
        </div>
      </div>

      {/* 2. Versión Escritorio: Mini Panel Resumen (Coordenadas y Ángulos debidamente etiquetados) */}
      <div className="hidden md:flex absolute top-3 left-3 z-10 pointer-events-none select-none">
        <div
          className={`px-3 py-2 rounded-lg border shadow-sm backdrop-blur-md flex flex-col gap-1.5 ${
            isDark
              ? 'bg-[#182234]/90 border-[#334155] text-[#f8fafc]'
              : 'bg-[#ffffff]/95 border-[#cbd5e1] text-[#0f172a]'
          }`}
        >
          {/* Fila 1: Coordenadas */}
          <div className="flex items-center gap-3 text-xs font-math font-medium">
            <span className="text-[11px] font-sans font-bold text-[#ea580c]">Coordenadas:</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-sans font-bold text-emerald-500">X</span>
              <span className={`font-bold ${isDark ? 'text-[#34d399]' : 'text-[#047857]'}`}>
                {telemetry.direct.resultX} m
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-sans font-bold text-indigo-500">Y</span>
              <span className={`font-bold ${isDark ? 'text-[#818cf8]' : 'text-[#4338ca]'}`}>
                {telemetry.direct.resultY} m
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-sans font-bold text-amber-500">Z</span>
              <span className={`font-bold ${isDark ? 'text-[#fbbf24]' : 'text-[#b45309]'}`}>
                {telemetry.direct.resultZ} m
              </span>
            </div>
          </div>

          {/* Fila 2: Ángulos */}
          <div className="flex items-center gap-2 border-t pt-1 border-inherit font-mono text-[10px]">
            <span className="font-sans font-semibold text-slate-400 mr-0.5">Ángulos:</span>
            <span>J1: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{Number(theta1Deg).toFixed(1)}°</strong></span>
            <span className="text-slate-400">•</span>
            <span>J2: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{Number(theta2Deg).toFixed(1)}°</strong></span>
            <span className="text-slate-400">•</span>
            <span>J3: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{Number(theta3Deg).toFixed(1)}°</strong></span>
          </div>
        </div>
      </div>

      {/* Banner / HUD Flotante Superior: Estado en Vivo de la Rutina Pick & Place */}
      {(routineStatus === 'RUNNING' || routineStatus === 'COMPLETED') && (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none max-w-[92vw]">
          <div
            className={`px-3.5 py-2 rounded-lg border shadow-lg backdrop-blur-md flex flex-col gap-1 items-center animate-in fade-in slide-in-from-top-2 duration-200 ${
              routineStatus === 'COMPLETED'
                ? isDark
                  ? 'bg-[#064e3b]/90 border-[#059669] text-[#a7f3d0]'
                  : 'bg-[#ecfdf5]/95 border-[#10b981] text-[#065f46]'
                : isDark
                ? 'bg-[#1e293b]/95 border-[#ea580c] text-[#f8fafc]'
                : 'bg-[#ffffff]/95 border-[#ea580c] text-[#0f172a]'
            }`}
          >
            <div className="flex items-center gap-2">
              {routineStatus === 'RUNNING' ? (
                <Loader2 className="w-4 h-4 text-[#ea580c] animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
              )}
              <span className="text-xs font-semibold tracking-wide uppercase">
                {statusMessage || 'Secuencia Pick & Place'}
              </span>
              <span className="text-[10px] font-mono opacity-80 font-bold">
                [{currentStepIndex + 1}/{totalSteps}]
              </span>
            </div>

            {/* Barra de progreso de la rutina */}
            <div className="w-48 h-1 rounded-full bg-slate-500/20 overflow-hidden">
              <div
                className="h-full bg-[#2563eb] transition-all duration-300"
                style={{ width: `${Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Vistas Rápidas de Cámara Flotantes en el Viewport (EXCLUSIVO MÓVIL < md) */}
      <div
        className={`md:hidden absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 p-1 rounded-lg border shadow-sm backdrop-blur-md select-none ${
          isDark
            ? 'bg-[#182234]/90 border-[#334155]'
            : 'bg-[#ffffff]/95 border-[#cbd5e1]'
        }`}
      >
        {[
          { id: 'isometric', label: 'Iso' },
          { id: 'top', label: 'Planta' },
          { id: 'front', label: 'Front' },
          { id: 'side', label: 'Lat' },
        ].map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onSetCameraView?.(view.id)}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
              isDark
                ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
                : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
            }`}
            title={`Vista de cámara ${view.label}`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Leyenda Técnica CAD en el borde inferior (ORIGINAL EXACTA) */}
      <div
        className={`absolute bottom-3 left-3 z-10 pointer-events-none hidden md:flex items-center gap-4 px-3.5 py-1.5 rounded border shadow-sm backdrop-blur-md text-[11px] font-math ${
          isDark
            ? 'bg-[#182234]/90 border-[#334155] text-[#cbd5e1]'
            : 'bg-[#ffffff]/95 border-[#cbd5e1] text-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-[#34d399]' : 'bg-[#047857]'}`} />
          <span className="font-sans font-medium">Eje X (Mesa)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-[#818cf8]' : 'bg-[#4338ca]'}`} />
          <span className="font-sans font-medium">Eje Y (Profundidad)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-[#fbbf24]' : 'bg-[#b45309]'}`} />
          <span className="font-sans font-medium">Cota Z (Altura)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
          <span className="font-sans font-medium">TCP (Efector Final)</span>
        </div>
      </div>
    </div>
  );
}
