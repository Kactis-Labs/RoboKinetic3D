import React from 'react';
import { AlertTriangle, Calculator, Info, Cpu, CheckCircle2, Gauge } from 'lucide-react';
import { PHYSICAL_LIMITS } from '../kinematics';

export default function MathReportPanel({
  theme,
  theta1Deg,
  theta2Deg,
  theta3Deg,
  l1,
  l2,
  payloadMass = PHYSICAL_LIMITS.defaultMassKg,
  setPayloadMass,
  telemetry,
  mobileTab = 'split',
}) {
  const isDark = theme === 'dark';
  const { direct, inverse, servos, torque } = telemetry;

  // Paleta de contraste calibrada para ingeniería
  const colors = {
    xText: isDark ? 'text-[#34d399]' : 'text-[#047857]',
    xBg: isDark ? 'bg-[#047857]/15' : 'bg-[#047857]/10',
    yText: isDark ? 'text-[#818cf8]' : 'text-[#4338ca]',
    yBg: isDark ? 'bg-[#4338ca]/15' : 'bg-[#4338ca]/10',
    zText: isDark ? 'text-[#fbbf24]' : 'text-[#b45309]',
    zBg: isDark ? 'bg-[#b45309]/15' : 'bg-[#b45309]/10',
    rText: isDark ? 'text-[#60a5fa]' : 'text-[#1d4ed8]',
    thetaText: isDark ? 'text-[#38bdf8]' : 'text-[#0284c7]',
    label: isDark ? 'text-[#94a3b8]' : 'text-[#475569]',
    sublabel: isDark ? 'text-[#cbd5e1]' : 'text-[#334155]',
    value: isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]',
    innerCard: isDark
      ? 'bg-[#0f172a] border-[#334155]'
      : 'bg-[#f1f5f9] border-[#cbd5e1]',
    divider: isDark ? 'border-[#334155]' : 'border-[#cbd5e1]',
  };

  const torqueTheme =
    torque?.level === 'red'
      ? {
          badge: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40',
          bar: 'bg-[#ef4444]',
          value: isDark ? 'text-[#f87171]' : 'text-[#dc2626]',
          dot: 'bg-[#ef4444]',
        }
      : torque?.level === 'amber'
      ? {
          badge: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40',
          bar: 'bg-[#f59e0b]',
          value: isDark ? 'text-[#fbbf24]' : 'text-[#d97706]',
          dot: 'bg-[#f59e0b]',
        }
      : {
          badge: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40',
          bar: 'bg-[#10b981]',
          value: isDark ? 'text-[#34d399]' : 'text-[#059669]',
          dot: 'bg-[#10b981]',
        };

  const reachPct = Math.min(100, Math.round((torque?.reachRatio || 0) * 100));
  const riskPct = Math.min(100, Math.round((torque?.riskRatio || 0) * 100));

  return (
    <aside
      className={`w-full md:w-[390px] lg:w-[440px] ${
        mobileTab === 'math' ? 'flex-1 min-h-0 h-full flex flex-col overflow-hidden' : 'hidden md:flex md:flex-col'
      } md:h-full border-0 md:border-l md:shrink-0 transition-colors select-text ${
        isDark
          ? 'bg-[#182234] border-[#334155] text-[#F8FAFC]'
          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
      }`}
    >
      {/* Encabezado: Título exacto "Cálculos Matemáticos" */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between shrink-0 ${
          isDark
            ? 'bg-[#141c2b] border-[#334155]'
            : 'bg-[#f1f5f9] border-[#cbd5e1]'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#ea580c] text-white flex items-center justify-center shadow-sm">
            <Calculator className="w-3 h-3" />
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-tight block leading-tight m-0">
              Cálculos Matemáticos
            </h2>
            <span className={`text-[10px] block leading-tight ${colors.label}`}>
              Cinemática Analítica Directa e Inversa
            </span>
          </div>
        </div>
      </div>

      {/* Contenedor scrolleable del Reporte Analítico */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4 text-xs font-sans touch-pan-y overscroll-contain">
        {/* ======================================================== */}
        {/* BLOQUE 1: VISTA LATERAL (PLANO VERTICAL r vs Z)          */}
        {/* ======================================================== */}
        <div
          className={`rounded border overflow-hidden ${
            isDark
              ? 'bg-[#1e293b]/50 border-[#334155]'
              : 'bg-[#ffffff] border-[#cbd5e1] shadow-sm'
          }`}
        >
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${
              isDark
                ? 'bg-[#141c2b] border-[#334155] text-[#e2e8f0]'
                : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <span>1. Vista Lateral: Plano Vertical (r vs Altura)</span>
            <span className={`font-math text-[11px] ${colors.rText}`}>
              L₀=0.60m · L₁={Number(l1).toFixed(2)}m · L₂={Number(l2).toFixed(2)}m
            </span>
          </div>

          <div className="p-3 space-y-3 font-math text-xs">
            {/* 1.1 Alcance horizontal total r */}
            <div className={`p-2.5 rounded border space-y-1.5 ${colors.innerCard}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-sans font-semibold ${colors.rText}`}>
                  Alcance Horizontal Total (r):
                </span>
                <span className={`text-[10px] font-sans ${colors.label}`}>Hombro + Codo</span>
              </div>

              <div className="text-xs font-bold tracking-wide text-[#2563eb] py-0.5">
                {direct.formulaR}
              </div>

              <div className={`text-[11px] ${colors.sublabel}`}>
                {direct.substitutionR}
              </div>

              <div className={`text-[10px] ${colors.label}`}>
                {direct.intermediateR}
              </div>

              <div className={`pt-1.5 border-t flex justify-between items-center text-xs ${colors.divider}`}>
                <span className={`font-sans text-[11px] font-medium ${colors.label}`}>
                  Radio Horizontal (r):
                </span>
                <span className={`font-bold text-sm ${colors.rText}`}>
                  r = {direct.resultR} m
                </span>
              </div>
            </div>

            {/* 1.2 Altura Vertical Total Z */}
            <div className={`p-2.5 rounded border space-y-1.5 ${colors.innerCard}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-sans font-semibold ${colors.zText}`}>
                  Altura Vertical Total (Z):
                </span>
                <span className={`text-[10px] font-sans ${colors.label}`}>Pedestal L₀ + Elevación</span>
              </div>

              <div className="text-xs font-bold tracking-wide text-[#b45309] dark:text-[#fbbf24] py-0.5">
                {direct.formulaZ}
              </div>

              <div className={`text-[11px] ${colors.sublabel}`}>
                {direct.substitutionZ}
              </div>

              <div className={`text-[10px] ${colors.label}`}>
                {direct.intermediateZ}
              </div>

              <div className={`pt-1.5 border-t flex justify-between items-center text-xs ${colors.divider}`}>
                <span className={`font-sans text-[11px] font-medium ${colors.label}`}>
                  Cota Vertical (Z):
                </span>
                <span className={`font-bold text-sm ${colors.zText}`}>
                  Z = {direct.resultZVal} m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BLOQUE 2: VISTA SUPERIOR (PLANO HORIZONTAL X vs Y)       */}
        {/* ======================================================== */}
        <div
          className={`rounded border overflow-hidden ${
            isDark
              ? 'bg-[#1e293b]/50 border-[#334155]'
              : 'bg-[#ffffff] border-[#cbd5e1] shadow-sm'
          }`}
        >
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${
              isDark
                ? 'bg-[#141c2b] border-[#334155] text-[#e2e8f0]'
                : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <span>2. Vista Superior: Plano Horizontal (Coordenadas Mesa)</span>
            <span className={`font-math text-[11px] ${colors.thetaText}`}>θ₁ = {Number(theta1Deg).toFixed(1)}°</span>
          </div>

          <div className="p-3 space-y-3 font-math text-xs">
            <div className={`p-2.5 rounded border space-y-2.5 ${colors.innerCard}`}>
              <div className="text-[11px] font-sans font-medium text-slate-400">
                Giro del Servomotor de Base (θ₁) proyectando el radio horizontal r:
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className={colors.xText}>{direct.formulaX}</span>
                  <span className={`font-bold ${colors.xText}`}>X = {direct.resultX} m</span>
                </div>
                <div className={`text-[10px] ${colors.label}`}>
                  X = {direct.resultR} · cos({Number(theta1Deg).toFixed(1)}°) = {direct.resultR} · ({direct.cosT1})
                </div>
              </div>

              <div className="space-y-0.5 pt-1.5 border-t border-dashed border-slate-600/30">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className={colors.yText}>{direct.formulaY}</span>
                  <span className={`font-bold ${colors.yText}`}>Y = {direct.resultY} m</span>
                </div>
                <div className={`text-[10px] ${colors.label}`}>
                  Y = {direct.resultR} · sin({Number(theta1Deg).toFixed(1)}°) = {direct.resultR} · ({direct.sinT1})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BLOQUE 3: VERIFICACIÓN INVERSA Y DISTANCIA ESPACIAL 3D   */}
        {/* ======================================================== */}
        <div
          className={`rounded border overflow-hidden ${
            isDark
              ? 'bg-[#1e293b]/50 border-[#334155]'
              : 'bg-[#ffffff] border-[#cbd5e1] shadow-sm'
          }`}
        >
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${
              isDark
                ? 'bg-[#141c2b] border-[#334155] text-[#e2e8f0]'
                : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <span>3. Verificación Geométrica Inversa y Espacio 3D</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
          </div>

          <div className="p-3 space-y-3 font-math text-xs">
            <div className={`p-2.5 rounded border space-y-1.5 ${colors.innerCard}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-sans font-semibold ${colors.value}`}>
                  Teorema de Pitágoras en la Mesa:
                </span>
                <span className={`font-semibold ${colors.rText}`}>{inverse.formulaR}</span>
              </div>
              <div className={`text-[11px] ${colors.sublabel}`}>
                r = √[({direct.resultX})² + ({direct.resultY})²] = <strong className={colors.rText}>{inverse.resultR} m</strong>
              </div>
              <div className={`text-[11px] ${colors.sublabel}`}>
                θ₁ = atan2(Y, X) = atan2({direct.resultY}, {direct.resultX}) = <strong className={colors.thetaText}>{inverse.resultThetaDeg}</strong>
              </div>
            </div>

            <div className={`p-2.5 rounded border space-y-1.5 ${colors.innerCard}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-sans font-semibold ${colors.value}`}>
                  Línea Directa desde el Hombro (ρ):
                </span>
                <span className="font-semibold text-[#d97706]">{inverse.formulaRho}</span>
              </div>
              <div className={`text-[11px] ${colors.sublabel}`}>
                {inverse.substitutionRho} = <strong className="text-[#d97706]">{inverse.resultRho} m</strong>
              </div>
              <div className={`text-[10px] ${colors.label}`}>
                Inclinación de la línea directa: φ = atan2(Z - L₀, r) = <strong className={colors.thetaText}>{inverse.resultPhiDeg}</strong>
              </div>
            </div>

            <div className={`p-2.5 rounded border space-y-1.5 ${colors.innerCard}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-sans font-semibold ${colors.zText}`}>
                  Ángulo del Codo (θ₃) · Ley de Cosenos:
                </span>
                <span className={`font-semibold ${colors.zText}`}>θ₃</span>
              </div>
              <div className="text-[11px] font-semibold text-[#b45309] dark:text-[#fbbf24]">
                {inverse.formulaCosT3}
              </div>
              <div className={`text-[10px] ${colors.sublabel}`}>
                {inverse.substitutionCosT3} = <strong className={colors.value}>{inverse.cosT3Val}</strong>
              </div>
              <div className={`pt-1.5 border-t flex justify-between items-center text-xs ${colors.divider}`}>
                <span className={`font-sans text-[11px] font-medium ${colors.label}`}>
                  Ángulo del Servomotor Codo:
                </span>
                <span className={`font-bold text-sm ${colors.zText}`}>
                  θ₃ = {inverse.resultTheta3Deg}
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded border space-y-1.5 ${colors.innerCard}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-sans font-semibold ${colors.xText}`}>
                  Ángulo del Hombro (θ₂) · Suma de Elevación:
                </span>
                <span className={`font-semibold ${colors.xText}`}>θ₂ = φ + β</span>
              </div>
              <div className={`text-[10px] ${colors.label}`}>
                Apertura del triángulo: {inverse.formulaBeta} → β = <strong className={colors.value}>{inverse.resultBetaDeg}</strong>
              </div>
              <div className={`text-[11px] ${colors.sublabel}`}>
                {inverse.substitutionTheta2}
              </div>
              <div className={`pt-1.5 border-t flex justify-between items-center text-xs ${colors.divider}`}>
                <span className={`font-sans text-[11px] font-medium ${colors.label}`}>
                  Ángulo del Servomotor Hombro:
                </span>
                <span className={`font-bold text-sm ${colors.xText}`}>
                  θ₂ = {inverse.resultTheta2Deg}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BLOQUE 4: TORQUE ESTÁTICO EN EL HOMBRO (N·m)             */}
        {/* ======================================================== */}
        <div
          className={`rounded border overflow-hidden ${
            isDark
              ? 'bg-[#1e293b]/50 border-[#334155]'
              : 'bg-[#ffffff] border-[#cbd5e1] shadow-sm'
          }`}
        >
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${
              isDark
                ? 'bg-[#141c2b] border-[#334155] text-[#e2e8f0]'
                : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {torque?.isOverloaded ? (
                <AlertTriangle className="w-3.5 h-3.5 fill-[#ef4444] text-white shrink-0" />
              ) : (
                <Gauge className="w-3.5 h-3.5 text-[#ea580c]" />
              )}
              <span>4. Torque Estático Realista en Hombro (J2)</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                torque?.isOverloaded
                  ? 'border-0 bg-[#ef4444] text-white'
                  : `border ${torqueTheme.badge}`
              }`}
            >
              {!torque?.isOverloaded && <span className={`w-1.5 h-1.5 rounded-full ${torqueTheme.dot}`} />}
              <span>{torque?.level === 'red' ? 'Sobrecarga' : torque?.level === 'amber' ? 'Precaución' : 'Seguro'}</span>
            </span>
          </div>

          <div className="p-3 space-y-2.5 text-xs">
            <div className={`p-2.5 rounded border space-y-1.5 font-math ${colors.innerCard}`}>
              <div className="flex items-center justify-between">
                <span className={`font-sans font-semibold text-[11px] ${colors.value}`}>
                  Par Total (|τ_L₁ + τ_L₂ + τ_TCP|):
                </span>
                <span className={`font-bold text-base ${torqueTheme.value}`}>
                  {torque ? torque.torqueNm.toFixed(2) : '0.00'} N·m
                </span>
              </div>
              <div className="text-[10px] font-semibold text-[#2563eb]">
                τ = |m₁·g·r_cm1 + m₂·g·r_cm2 + (m_pinza + m_cubo)·g·r|
              </div>
              <div className={`text-[10px] ${colors.sublabel}`}>
                Eslabones: τ₁={torque ? torque.torqueLink1Nm.toFixed(1) : '0.0'} · τ₂={torque ? torque.torqueLink2Nm.toFixed(1) : '0.0'} N·m
              </div>
              <div className={`text-[10px] ${colors.sublabel}`}>
                Efector ({torque ? torque.gripperMassKg.toFixed(2) : '0.35'} + {torque?.isGripped ? torque.activeCubeMassKg.toFixed(1) : '0.0'} kg): τ_tcp={torque ? torque.torqueTcpNm.toFixed(1) : '0.0'} N·m
              </div>

              {/* Barras de alcance y carga */}
              <div className={`pt-1.5 border-t space-y-1.5 font-sans ${colors.divider}`}>
                <div className="flex justify-between text-[10px]">
                  <span className={colors.label}>
                    Alcance ({torque ? torque.leverArmM.toFixed(2) : '0.00'} / {torque ? torque.maxReachM.toFixed(2) : '3.20'} m)
                  </span>
                  <span className={`font-mono font-bold ${torqueTheme.value}`}>{reachPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-500/20 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${torqueTheme.bar}`}
                    style={{ width: `${riskPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Slider sincronizado de Masa del Cubo */}
            <div className={`p-2 rounded border space-y-1 ${colors.innerCard}`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium">
                  Masa del Cubo ({torque?.isGripped ? 'Sujeto en pinza' : 'En reposo · 0.0 kg en pinza'}):
                </span>
                <span className={`font-math font-bold ${colors.value}`}>
                  {Number(payloadMass).toFixed(1)} kg
                </span>
              </div>
              <input
                type="range"
                min={PHYSICAL_LIMITS.minMassKg}
                max={PHYSICAL_LIMITS.maxMassKg}
                step="0.1"
                value={payloadMass}
                onChange={(e) => setPayloadMass && setPayloadMass(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className={`flex justify-between text-[9px] font-mono ${colors.label}`}>
                <span>{PHYSICAL_LIMITS.minMassKg.toFixed(1)} kg</span>
                <span>Límite ref: {PHYSICAL_LIMITS.safeTorqueLimitNm} N·m</span>
                <span>{PHYSICAL_LIMITS.maxMassKg.toFixed(1)} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BLOQUE 5: TELEMETRÍA DE LOS SERVOMOTORES FÍSICOS         */}
        {/* ======================================================== */}
        <div
          className={`rounded border overflow-hidden ${
            isDark
              ? 'bg-[#1e293b]/50 border-[#334155]'
              : 'bg-[#ffffff] border-[#cbd5e1] shadow-sm'
          }`}
        >
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${
              isDark
                ? 'bg-[#141c2b] border-[#334155] text-[#e2e8f0]'
                : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>5. Telemetría de los 3 Servomotores</span>
            </div>
            <span className="text-[10px] text-[#2563eb] font-semibold">Actuadores Físicos</span>
          </div>

          <div className="p-3 space-y-2.5 text-xs">
            {/* Servo 1 */}
            <div className={`p-2 rounded border flex items-center justify-between ${colors.innerCard}`}>
              <div>
                <span className="font-bold text-[11px] block">{servos.j1.name} (J1)</span>
                <span className={`text-[10px] ${colors.label}`}>{servos.j1.axis}</span>
              </div>
              <div className="text-right font-math">
                <span className="font-bold text-xs text-[#38bdf8]">{Number(theta1Deg).toFixed(1)}°</span>
                <span className={`text-[10px] block font-sans ${colors.label}`}>{servos.j1.range}</span>
              </div>
            </div>

            {/* Servo 2 */}
            <div className={`p-2 rounded border flex items-center justify-between ${colors.innerCard}`}>
              <div>
                <span className="font-bold text-[11px] block">{servos.j2.name} (J2)</span>
                <span className={`text-[10px] ${colors.label}`}>
                  {servos.j2.axis} · τ: {servos.j2.torqueNm.toFixed(1)} N·m ({servos.j2.loadFactor}%)
                </span>
              </div>
              <div className="text-right font-math">
                <span className="font-bold text-xs text-[#34d399]">{Number(theta2Deg).toFixed(1)}°</span>
                <span className={`text-[10px] block font-sans ${colors.label}`}>{servos.j2.range}</span>
              </div>
            </div>

            {/* Servo 3 */}
            <div className={`p-2 rounded border flex items-center justify-between ${colors.innerCard}`}>
              <div>
                <span className="font-bold text-[11px] block">{servos.j3.name} (J3)</span>
                <span className={`text-[10px] ${colors.label}`}>{servos.j3.axis} · Flexión Relativa</span>
              </div>
              <div className="text-right font-math">
                <span className="font-bold text-xs text-[#fbbf24]">{Number(theta3Deg).toFixed(1)}°</span>
                <span className={`text-[10px] block font-sans ${colors.label}`}>{servos.j3.range}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BLOQUE 6: NOTA TÉCNICA PEDAGÓGICA                        */}
        {/* ======================================================== */}
        <div
          className={`p-3 rounded border text-[11px] space-y-1.5 ${
            isDark
              ? 'bg-[#141c2b]/60 border-[#334155] text-[#cbd5e1]'
              : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-[#2563eb]">
            <Info className="w-3.5 h-3.5" />
            <span>Fundamento Geométrico</span>
          </div>
          <p className="leading-relaxed">
            La cinemática directa desacopla el movimiento en dos planos: la elevación en el plano vertical mediante trigonometría de los eslabones articulados (L₁ y L₂) para hallar el alcance radial <em>r</em> y la altura <em>Z</em>; y la proyección horizontal mediante el giro de la base (θ₁) para determinar las cotas <em>X</em> e <em>Y</em> en la mesa de trabajo.
          </p>
        </div>
      </div>
    </aside>
  );
}
