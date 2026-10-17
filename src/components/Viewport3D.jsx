import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { degToRad } from '../kinematics';
import { Compass, Cpu } from 'lucide-react';

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

    // Cámara de perspectiva CAD
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6.8, 5.8, 8.2);
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
    controls.minDistance = 2.0;
    controls.maxDistance = 25;
    controls.target.set(0, 0.9, 0);
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

    // Cuadrícula métrica técnica (GridHelper)
    const grid = new THREE.GridHelper(12, 24);
    grid.position.y = 0.001;
    scene.add(grid);
    gridRef.current = grid;

    // Anillos concéntricos polares en el suelo (1m a 5m)
    const polarCirclesGroup = new THREE.Group();
    for (let radius = 1; radius <= 5; radius++) {
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
        opacity: radius === 5 ? 0.35 : 0.16,
      });
      polarCirclesGroup.add(new THREE.Line(circleGeo, circleMat));
    }
    scene.add(polarCirclesGroup);

    // Rayos radiales a 0°, 45°, 90°, etc.
    const raysGroup = new THREE.Group();
    for (let deg = 0; deg < 360; deg += 45) {
      const rad = (deg * Math.PI) / 180;
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.002, 0),
        new THREE.Vector3(Math.cos(rad) * 5.2, 0.002, -Math.sin(rad) * 5.2),
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
      new THREE.Vector3(-6, 0.003, 0),
      new THREE.Vector3(6, 0.003, 0),
    ]);
    const xAxisLine = new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({
      color: 0x047857,
      transparent: true,
      opacity: 0.85,
    }));
    scene.add(xAxisLine);
    xAxisLineRef.current = xAxisLine;

    const yAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.003, -6),
      new THREE.Vector3(0, 0.003, 6),
    ]);
    const yAxisLine = new THREE.Line(yAxisGeo, new THREE.LineBasicMaterial({
      color: 0x4338ca,
      transparent: true,
      opacity: 0.85,
    }));
    scene.add(yAxisLine);
    yAxisLineRef.current = yAxisLine;

    // Función constructora de placas de texto para cotas y ejes
    const createTextSprite = (text, textColor, isDarkTheme, scaleX = 1.0) => {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 70;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = isDarkTheme ? '#1e293b' : '#ffffff';
      if (ctx.roundRect) {
        ctx.roundRect(8, 8, 164, 54, 8);
      } else {
        ctx.rect(8, 8, 164, 54);
      }
      ctx.fill();

      ctx.strokeStyle = isDarkTheme ? '#475569' : '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 90, 36);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(scaleX, 0.42 * scaleX, 1);
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
      sX.position.set(5.7, 0.25, 0);
      spriteGroup.add(sX);

      const sMinusX = createTextSprite('-X', xColor, dark);
      sMinusX.position.set(-5.7, 0.25, 0);
      spriteGroup.add(sMinusX);

      const sY = createTextSprite('+Y', yColor, dark);
      sY.position.set(0, 0.25, -5.7);
      spriteGroup.add(sY);

      const sMinusY = createTextSprite('-Y', yColor, dark);
      sMinusY.position.set(0, 0.25, 5.7);
      spriteGroup.add(sMinusY);
    };
    updateSprites(isDark);
    scene.add(spriteGroup);
    spriteUpdaterRef.current = updateSprites;

    // =========================================================================
    // 2. CONSTRUCCIÓN DETALLADA DEL ROBOT ARTICULADO (3 DOF Y SERVOMOTORES)
    // =========================================================================
    // Materiales PBR
    const matBase = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });
    const matServoBody = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.85 });
    const matServoCap = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.2, metalness: 0.9 });
    const matServoHorn = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 }); // Dorado técnico
    const matArm1 = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.25, metalness: 0.7 });
    const matArm2 = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.75 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.2, metalness: 0.85 });
    const matGripper = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 });

    materialsRef.current = {
      matBase,
      matServoBody,
      matServoCap,
      matServoHorn,
      matArm1,
      matArm2,
      matAccent,
      matGripper,
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

    // Orejetas verticales de soporte del hombro (Twin Brackets)
    const bracketWidth = 0.12;
    const bracketHeight = 0.54;
    const bracketGeo = new THREE.BoxGeometry(0.32, bracketHeight, bracketWidth);
    const bracketLeft = new THREE.Mesh(bracketGeo, matBase);
    bracketLeft.position.set(0, bracketHeight * 0.5 + 0.12, 0.24);
    bracketLeft.castShadow = true;
    turntableGroup.add(bracketLeft);

    const bracketRight = new THREE.Mesh(bracketGeo, matBase);
    bracketRight.position.set(0, bracketHeight * 0.5 + 0.12, -0.24);
    bracketRight.castShadow = true;
    turntableGroup.add(bracketRight);

    // Servomotor J2 (Hombro - Montado horizontalmente entre las orejetas)
    const servoJ2 = createServoModel('J2_SHOULDER', 0.44, 0.18, false);
    servoJ2.position.set(0, 0.58, 0); // Eje a altura hBase ~ 0.60m desde el suelo
    turntableGroup.add(servoJ2);

    // C) PIVOTE DEL HOMBRO (J2 Pitch: rota en Z local según theta2)
    // El eje del hombro se ubica a altura hBase (0.6m desde el suelo)
    // Dentro de turntableGroup, hBase corresponde a 0.60 - 0.38 = 0.22m
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(0, 0.58, 0); // Coincide con el eje de rotación del servo J2
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

    // E) Efector Final (Muñeca + Tool Center Point TCP)
    const tcpGroup = new THREE.Group();
    tcpGroup.position.set(1.4, 0, 0); // Se ajusta dinámicamente con L2
    elbowPivot.add(tcpGroup);
    tcpMarkerRef.current = tcpGroup;

    // Muñeca con brida cilíndrica
    const wristGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 24);
    wristGeo.rotateZ(Math.PI / 2);
    const wrist = new THREE.Mesh(wristGeo, matServoCap);
    wrist.castShadow = true;
    tcpGroup.add(wrist);

    // Pinza de agarre de dos dedos (Gripper mecánico estilizado)
    const fingerGeo = new THREE.BoxGeometry(0.18, 0.04, 0.035);
    const finger1 = new THREE.Mesh(fingerGeo, matGripper);
    finger1.position.set(0.1, 0, 0.07);
    finger1.rotation.y = -0.15;
    finger1.castShadow = true;
    tcpGroup.add(finger1);

    const finger2 = new THREE.Mesh(fingerGeo, matGripper);
    finger2.position.set(0.1, 0, -0.07);
    finger2.rotation.y = 0.15;
    finger2.castShadow = true;
    tcpGroup.add(finger2);

    // Esfera emisiva indicadora de posición TCP
    const tcpSphereGeo = new THREE.SphereGeometry(0.09, 32, 32);
    const tcpSphereMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.8,
    });
    const tcpSphere = new THREE.Mesh(tcpSphereGeo, tcpSphereMat);
    tcpSphere.position.x = 0.14;
    tcpSphere.castShadow = true;
    tcpGroup.add(tcpSphere);

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

      if (materialsRef.current.matBase) materialsRef.current.matBase.color.setHex(0x1e293b);
      if (materialsRef.current.matArm1) materialsRef.current.matArm1.color.setHex(0x2563eb);
      if (materialsRef.current.matArm2) materialsRef.current.matArm2.color.setHex(0x3b82f6);
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

      if (materialsRef.current.matBase) materialsRef.current.matBase.color.setHex(0x475569);
      if (materialsRef.current.matArm1) materialsRef.current.matArm1.color.setHex(0x2563eb);
      if (materialsRef.current.matArm2) materialsRef.current.matArm2.color.setHex(0x1d4ed8);
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

    // Escalar la longitud del eslabón 2 (L2)
    link2MeshRef.current.scale.set(l2, 1, 1);

    // Posicionar el efector final TCP al final del eslabón 2 (X = L2)
    tcpMarkerRef.current.position.set(l2, 0, 0);

    // Coordenadas cartesianas espaciales calculadas
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

    // G) Diana en el suelo en la proyección (X, Y)
    if (groundTargetRef.current) {
      groundTargetRef.current.position.set(x, 0.005, yDepth);
    }
  }, [theta1Deg, theta2Deg, theta3Deg, l1, l2, hBase, telemetry]);

  // =========================================================================
  // 7. RESPUESTA A CAMBIO DE VISTA DE CÁMARA
  // =========================================================================
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !cameraViewTrigger) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (cameraViewTrigger.view) {
      case 'top':
        camera.position.set(0, 12, 0.001);
        controls.target.set(0, 0, 0);
        break;
      case 'front':
        camera.position.set(0, 1.8, 10.5);
        controls.target.set(0, 1.0, 0);
        break;
      case 'side':
        camera.position.set(10.5, 1.8, 0.001);
        controls.target.set(0, 1.0, 0);
        break;
      case 'isometric':
      default:
        camera.position.set(6.8, 5.8, 8.2);
        controls.target.set(0, 0.9, 0);
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

      {/* Indicador Flotante Superior Izquierdo: Coordenadas CAD en Vivo */}
      {/* 1. Versión Móvil: Compacta con botón de info */}
      <div className="md:hidden absolute top-2.5 left-2.5 z-10 select-none max-w-[calc(100vw-20px)]">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border shadow-sm backdrop-blur-md text-[10px] font-math ${
            isDark
              ? 'bg-[#182234]/95 border-[#334155] text-[#f8fafc]'
              : 'bg-[#ffffff]/95 border-[#cbd5e1] text-[#0f172a]'
          }`}
        >
          <span className="font-sans font-bold text-[#2563eb]">TCP:</span>
          <span className={`font-bold ${isDark ? 'text-[#34d399]' : 'text-[#047857]'}`}>
            X:{telemetry.direct.resultX}
          </span>
          <span className={`font-bold ${isDark ? 'text-[#818cf8]' : 'text-[#4338ca]'}`}>
            Y:{telemetry.direct.resultY}
          </span>
          <span className={`font-bold ${isDark ? 'text-[#fbbf24]' : 'text-[#b45309]'}`}>
            Z:{telemetry.direct.resultZ}
          </span>
          <span className="text-slate-400">m</span>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-sans font-medium transition-colors ${
              isDark
                ? 'bg-[#1e293b] text-[#38bdf8] border border-[#334155]'
                : 'bg-[#e2e8f0] text-[#0284c7] border border-[#cbd5e1]'
            }`}
          >
            {showDetails ? '▲' : '▼'}
          </button>
        </div>

        {showDetails && (
          <div
            className={`mt-1 px-3 py-2 rounded border shadow-sm backdrop-blur-md space-y-1.5 ${
              isDark
                ? 'bg-[#182234]/95 border-[#334155] text-[#f8fafc]'
                : 'bg-[#ffffff]/95 border-[#cbd5e1] text-[#0f172a]'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-math">
              <span>Radio Suelo r_xy: <strong className="text-[#3b82f6]">{telemetry.direct.resultRGround} m</strong></span>
              <span>Dist 3D ρ: <strong className="text-[#d97706]">{telemetry.direct.resultRho} m</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Versión Escritorio: TARJETA ORIGINAL EXACTA */}
      <div className="hidden md:flex absolute top-3 left-3 z-10 pointer-events-none flex-col gap-1.5 select-none">
        <div
          className={`px-3.5 py-2.5 rounded border shadow-sm backdrop-blur-md space-y-1.5 ${
            isDark
              ? 'bg-[#182234]/90 border-[#334155] text-[#f8fafc]'
              : 'bg-[#ffffff]/95 border-[#cbd5e1] text-[#0f172a]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2563eb]">
              <Compass className="w-3.5 h-3.5" />
              <span>Espacio de Trabajo CAD 3D</span>
            </div>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                isDark ? 'border-[#334155] bg-[#0f172a] text-[#38bdf8]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#0284c7]'
              }`}
            >
              3 DOF
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-math font-medium">
            <div className="flex flex-col">
              <span className={`text-[9px] font-sans ${isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>Cota X:</span>
              <span className={`font-bold text-xs ${isDark ? 'text-[#34d399]' : 'text-[#047857]'}`}>
                {telemetry.direct.resultX} m
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[9px] font-sans ${isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>Cota Y:</span>
              <span className={`font-bold text-xs ${isDark ? 'text-[#818cf8]' : 'text-[#4338ca]'}`}>
                {telemetry.direct.resultY} m
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[9px] font-sans ${isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>Cota Z:</span>
              <span className={`font-bold text-xs ${isDark ? 'text-[#fbbf24]' : 'text-[#b45309]'}`}>
                {telemetry.direct.resultZ} m
              </span>
            </div>
          </div>

          <div
            className={`pt-1 border-t flex items-center justify-between text-[9px] font-math ${
              isDark ? 'border-[#334155] text-[#94a3b8]' : 'border-[#cbd5e1] text-[#64748b]'
            }`}
          >
            <span>r_xy: <strong className="text-[#3b82f6]">{telemetry.direct.resultRGround} m</strong></span>
            <span>Dist 3D ρ: <strong className="text-[#d97706]">{telemetry.direct.resultRho} m</strong></span>
          </div>
        </div>
      </div>

      {/* Badges de Articulaciones Activas (Visible en pantallas extra grandes para evitar colisión) */}
      <div className="absolute top-3 right-3 z-10 pointer-events-none hidden xl:flex flex-col gap-1 select-none">
        <div
          className={`px-2.5 py-1.5 rounded border shadow-sm backdrop-blur-md text-[10px] space-y-1 ${
            isDark ? 'bg-[#182234]/85 border-[#334155] text-[#cbd5e1]' : 'bg-[#ffffff]/90 border-[#cbd5e1] text-[#334155]'
          }`}
        >
          <div className="flex items-center gap-1 font-semibold text-[#2563eb]">
            <Cpu className="w-3 h-3" />
            <span>Servomotores Industriales</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span>J1: {Number(theta1Deg).toFixed(1)}°</span>
            <span>•</span>
            <span>J2: {Number(theta2Deg).toFixed(1)}°</span>
            <span>•</span>
            <span>J3: {Number(theta3Deg).toFixed(1)}°</span>
          </div>
        </div>
      </div>

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
