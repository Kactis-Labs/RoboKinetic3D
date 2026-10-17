import React from 'react';
import { Sliders, Cpu, Ruler } from 'lucide-react';
import { degToRad } from '../kinematics';

export default function PropertyManager({
  theme,
  theta1Deg,
  setTheta1Deg,
  theta2Deg,
  setTheta2Deg,
  theta3Deg,
  setTheta3Deg,
  l1,
  setL1,
  l2,
  setL2,
  telemetry,
  onPosePreset,
  mobileTab = 'split',
}) {
  const isDark = theme === 'dark';
  const { direct } = telemetry;

  // Handlers seguros para inputs
  const handleTheta1Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setTheta1Deg(Math.max(-180, Math.min(180, val)));
  };

  const handleTheta2Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setTheta2Deg(Math.max(-20, Math.min(100, val)));
  };

  const handleTheta3Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setTheta3Deg(Math.max(-120, Math.min(60, val)));
  };

  const handleL1Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setL1(Math.max(1.0, Math.min(2.5, val)));
  };

  const handleL2Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setL2(Math.max(0.8, Math.min(2.0, val)));
  };

  // Paleta de contraste calibrada
  const colors = {
    xText: isDark ? 'text-[#34d399]' : 'text-[#047857]',
    xBg: isDark ? 'bg-[#047857]/20 text-[#34d399]' : 'bg-[#047857]/10 text-[#047857]',
    yText: isDark ? 'text-[#818cf8]' : 'text-[#4338ca]',
    yBg: isDark ? 'bg-[#4338ca]/20 text-[#818cf8]' : 'bg-[#4338ca]/10 text-[#4338ca]',
    zText: isDark ? 'text-[#fbbf24]' : 'text-[#b45309]',
    zBg: isDark ? 'bg-[#b45309]/20 text-[#fbbf24]' : 'bg-[#b45309]/10 text-[#b45309]',
    rText: isDark ? 'text-[#60a5fa]' : 'text-[#1d4ed8]',
    thetaText: isDark ? 'text-[#38bdf8]' : 'text-[#0284c7]',
    label: isDark ? 'text-[#94a3b8]' : 'text-[#475569]',
    sublabel: isDark ? 'text-[#cbd5e1]' : 'text-[#334155]',
    value: isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]',
    innerCard: isDark
      ? 'bg-[#0f172a] border-[#334155]'
      : 'bg-[#f8fafc] border-[#cbd5e1]',
    divider: isDark ? 'border-[#334155]' : 'border-[#cbd5e1]',
  };

  return (
    <aside
      className={`w-full md:w-80 lg:w-[350px] ${
        mobileTab === 'split' ? 'flex-1 flex flex-col' : 'hidden md:flex md:flex-col'
      } md:h-full border-r shrink-0 transition-colors select-none ${
        isDark
          ? 'bg-[#182234] border-[#334155] text-[#F8FAFC]'
          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
      }`}
    >
      {/* Encabezado PropertyManager estilo CAD */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
          isDark
            ? 'bg-[#141c2b] border-[#334155]'
            : 'bg-[#f1f5f9] border-[#cbd5e1]'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#2563eb] text-white flex items-center justify-center shadow-sm">
            <Sliders className="w-3 h-3" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-tight block leading-tight">
              PropertyManager
            </span>
            <span className={`text-[10px] block leading-tight ${colors.label}`}>
              Actuadores & Articulaciones (J1 - J2 - J3)
            </span>
          </div>
        </div>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
            isDark
              ? 'bg-[#0f172a] border-[#334155] text-[#38bdf8]'
              : 'bg-[#ffffff] border-[#cbd5e1] text-[#0284c7]'
          }`}
        >
          DOF: 3 (3D)
        </span>
      </div>

      {/* Contenedor scrolleable de propiedades */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs font-sans touch-pan-y">
        {/* ======================================================== */}
        {/* PRESETS DE POSTURA RÁPIDOS (SOLO EN MÓVIL < md)           */}
        {/* ======================================================== */}
        {onPosePreset && (
          <div
            className={`md:hidden p-2 rounded border flex flex-col gap-1.5 ${
              isDark ? 'bg-[#1e293b]/60 border-[#334155]' : 'bg-[#ffffff] border-[#cbd5e1] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className={colors.label}>Posturas Predeterminadas:</span>
              <span className={`font-mono text-[9px] ${colors.rText}`}>1-TAP</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'Home', pose: { t1: 0, t2: 70, t3: -70 }, title: 'Reposo vertical' },
                { label: '45°', pose: { t1: 45, t2: 35, t3: -25 }, title: 'Inspección espacial' },
                { label: 'Ext.', pose: { t1: 0, t2: 0, t3: 0 }, title: 'Extensión completa' },
                { label: 'Pick', pose: { t1: 90, t2: 15, t3: -55 }, title: 'Agarre a suelo' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onPosePreset(p.pose)}
                  className={`py-1 rounded text-[11px] font-medium border text-center transition-all active:scale-95 ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1] hover:text-white hover:bg-[#1e293b]'
                      : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155] hover:text-black hover:bg-[#e2e8f0]'
                  }`}
                  title={p.title}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* GRUPO 1: SERVOMOTORES ARTICULARES (ENTRADA)               */}
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
              <span>Servomotores Rotacionales</span>
            </div>
            <span className={`font-math text-[11px] font-semibold ${colors.rText}`}>θ₁, θ₂, θ₃</span>
          </div>

          <div className="p-3 space-y-3.5">
            {/* --- MOTOR 1: BASE (J1) --- */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-medium flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-4 h-4 rounded font-mono font-bold text-[10px] flex items-center justify-center ${
                      isDark ? 'bg-[#38bdf8]/20 text-[#38bdf8]' : 'bg-[#0284c7]/15 text-[#0284c7]'
                    }`}
                  >
                    J1
                  </span>
                  <span className={colors.value}>Base (θ₁):</span>
                  <span className={`text-[10px] ${colors.label}`}>Giro</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step="0.5"
                    value={Number(theta1Deg).toFixed(1)}
                    onChange={handleTheta1Input}
                    className={`w-14 px-1.5 py-0.5 text-right font-math text-xs font-semibold rounded border focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
                      isDark
                        ? 'bg-[#0f172a] border-[#334155] text-[#f8fafc]'
                        : 'bg-[#ffffff] border-[#cbd5e1] text-[#0f172a]'
                    }`}
                  />
                  <span className={`font-math ${colors.label}`}>°</span>
                </div>
              </div>

              {/* Slider continuo original para escritorio */}
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={theta1Deg}
                onChange={(e) => setTheta1Deg(parseFloat(e.target.value))}
                className="hidden md:block"
              />

              {/* Slider táctil con botones paso a paso exclusivo para móvil */}
              <div className="flex md:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheta1Deg((prev) => Math.max(-180, parseFloat((Number(prev) - 5).toFixed(1))))}
                  className={`h-7 px-2 rounded border font-mono text-[10px] font-bold select-none active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
                      : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:text-black'
                  }`}
                  title="Giro -5°"
                >
                  -5°
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="0.5"
                    value={theta1Deg}
                    onChange={(e) => setTheta1Deg(parseFloat(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTheta1Deg((prev) => Math.min(180, parseFloat((Number(prev) + 5).toFixed(1))))}
                  className={`h-7 px-2 rounded border font-mono text-[10px] font-bold select-none active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
                      : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:text-black'
                  }`}
                  title="Giro +5°"
                >
                  +5°
                </button>
              </div>

              <div className={`flex justify-between items-center text-[10px] font-math ${colors.label}`}>
                <span>-180°</span>
                <span className={`font-medium ${colors.rText}`}>
                  {degToRad(theta1Deg).toFixed(3)} rad
                </span>
                <span>+180°</span>
              </div>
            </div>

            {/* Divisor fino */}
            <div className={`border-t ${colors.divider}`} />

            {/* --- MOTOR 2: HOMBRO (J2) --- */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-medium flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-4 h-4 rounded font-mono font-bold text-[10px] flex items-center justify-center ${
                      isDark ? 'bg-[#34d399]/20 text-[#34d399]' : 'bg-[#047857]/15 text-[#047857]'
                    }`}
                  >
                    J2
                  </span>
                  <span className={colors.value}>Hombro (θ₂):</span>
                  <span className={`text-[10px] ${colors.label}`}>Elevación</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-20"
                    max="100"
                    step="0.5"
                    value={Number(theta2Deg).toFixed(1)}
                    onChange={handleTheta2Input}
                    className={`w-14 px-1.5 py-0.5 text-right font-math text-xs font-semibold rounded border focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
                      isDark
                        ? 'bg-[#0f172a] border-[#334155] text-[#f8fafc]'
                        : 'bg-[#ffffff] border-[#cbd5e1] text-[#0f172a]'
                    }`}
                  />
                  <span className={`font-math ${colors.label}`}>°</span>
                </div>
              </div>

              {/* Slider continuo original para escritorio */}
              <input
                type="range"
                min="-20"
                max="100"
                step="0.5"
                value={theta2Deg}
                onChange={(e) => setTheta2Deg(parseFloat(e.target.value))}
                className="hidden md:block"
              />

              {/* Slider táctil con botones paso a paso exclusivo para móvil */}
              <div className="flex md:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheta2Deg((prev) => Math.max(-20, parseFloat((Number(prev) - 5).toFixed(1))))}
                  className={`h-7 px-2 rounded border font-mono text-[10px] font-bold select-none active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
                      : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:text-black'
                  }`}
                  title="Elevación -5°"
                >
                  -5°
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="-20"
                    max="100"
                    step="0.5"
                    value={theta2Deg}
                    onChange={(e) => setTheta2Deg(parseFloat(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTheta2Deg((prev) => Math.min(100, parseFloat((Number(prev) + 5).toFixed(1))))}
                  className={`h-7 px-2 rounded border font-mono text-[10px] font-bold select-none active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
                      : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:text-black'
                  }`}
                  title="Elevación +5°"
                >
                  +5°
                </button>
              </div>

              <div className={`flex justify-between items-center text-[10px] font-math ${colors.label}`}>
                <span>-20°</span>
                <span className={`font-medium ${colors.xText}`}>
                  {degToRad(theta2Deg).toFixed(3)} rad
                </span>
                <span>+100°</span>
              </div>
            </div>

            {/* Divisor fino */}
            <div className={`border-t ${colors.divider}`} />

            {/* --- MOTOR 3: CODO (J3) --- */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-medium flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-4 h-4 rounded font-mono font-bold text-[10px] flex items-center justify-center ${
                      isDark ? 'bg-[#fbbf24]/20 text-[#fbbf24]' : 'bg-[#b45309]/15 text-[#b45309]'
                    }`}
                  >
                    J3
                  </span>
                  <span className={colors.value}>Codo (θ₃):</span>
                  <span className={`text-[10px] ${colors.label}`}>Flexión</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-120"
                    max="60"
                    step="0.5"
                    value={Number(theta3Deg).toFixed(1)}
                    onChange={handleTheta3Input}
                    className={`w-14 px-1.5 py-0.5 text-right font-math text-xs font-semibold rounded border focus:outline-none focus:ring-1 focus:ring-[#2563eb] ${
                      isDark
                        ? 'bg-[#0f172a] border-[#334155] text-[#f8fafc]'
                        : 'bg-[#ffffff] border-[#cbd5e1] text-[#0f172a]'
                    }`}
                  />
                  <span className={`font-math ${colors.label}`}>°</span>
                </div>
              </div>

              {/* Slider continuo original para escritorio */}
              <input
                type="range"
                min="-120"
                max="60"
                step="0.5"
                value={theta3Deg}
                onChange={(e) => setTheta3Deg(parseFloat(e.target.value))}
                className="hidden md:block"
              />

              {/* Slider táctil con botones paso a paso exclusivo para móvil */}
              <div className="flex md:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheta3Deg((prev) => Math.max(-120, parseFloat((Number(prev) - 5).toFixed(1))))}
                  className={`h-7 px-2 rounded border font-mono text-[10px] font-bold select-none active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
                      : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:text-black'
                  }`}
                  title="Flexión -5°"
                >
                  -5°
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="-120"
                    max="60"
                    step="0.5"
                    value={theta3Deg}
                    onChange={(e) => setTheta3Deg(parseFloat(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTheta3Deg((prev) => Math.min(60, parseFloat((Number(prev) + 5).toFixed(1))))}
                  className={`h-7 px-2 rounded border font-mono text-[10px] font-bold select-none active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
                      : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569] hover:text-black'
                  }`}
                  title="Flexión +5°"
                >
                  +5°
                </button>
              </div>

              <div className={`flex justify-between items-center text-[10px] font-math ${colors.label}`}>
                <span>-120°</span>
                <span className={`font-medium ${colors.zText}`}>
                  {degToRad(theta3Deg).toFixed(3)} rad
                </span>
                <span>+60°</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* GRUPO 2: DIMENSIONES MECÁNICAS (ESLABONES)                */}
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
              <Ruler className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Eslabones Mecánicos</span>
            </div>
            <span className={`font-math text-[11px] font-semibold ${colors.rText}`}>L₀, L₁, L₂</span>
          </div>

          <div className="p-3 space-y-3">
            {/* Eslabón 0: Pedestal Fijo */}
            <div className={`p-2 rounded border flex items-center justify-between text-[11px] ${colors.innerCard}`}>
              <span className={colors.sublabel}>L₀ (Pedestal de Base):</span>
              <span className={`font-math font-bold ${colors.rText}`}>0.60 m</span>
            </div>

            {/* Eslabón 1: L1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${colors.sublabel}`}>L₁ (Brazo Húmero):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={Number(l1).toFixed(2)}
                    onChange={handleL1Input}
                    className={`w-14 px-1 py-0.5 text-right font-math text-xs font-semibold rounded border ${
                      isDark ? 'bg-[#0f172a] border-[#334155]' : 'bg-[#ffffff] border-[#cbd5e1]'
                    }`}
                  />
                  <span className={`font-math ${colors.label}`}>m</span>
                </div>
              </div>

              {/* Slider continuo original para escritorio */}
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.05"
                value={l1}
                onChange={(e) => setL1(parseFloat(e.target.value))}
                className="hidden md:block"
              />

              {/* Slider táctil para móvil */}
              <div className="flex md:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setL1((prev) => Math.max(1.0, parseFloat((Number(prev) - 0.1).toFixed(2))))}
                  className={`h-6 px-1.5 rounded border font-mono text-[9px] font-bold select-none active:scale-95 ${
                    isDark ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8]' : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
                  }`}
                  title="Reducir L1"
                >
                  -0.1
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={l1}
                    onChange={(e) => setL1(parseFloat(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setL1((prev) => Math.min(2.5, parseFloat((Number(prev) + 0.1).toFixed(2))))}
                  className={`h-6 px-1.5 rounded border font-mono text-[9px] font-bold select-none active:scale-95 ${
                    isDark ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8]' : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
                  }`}
                  title="Aumentar L1"
                >
                  +0.1
                </button>
              </div>
            </div>

            {/* Eslabón 2: L2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${colors.sublabel}`}>L₂ (Antebrazo):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={Number(l2).toFixed(2)}
                    onChange={handleL2Input}
                    className={`w-14 px-1 py-0.5 text-right font-math text-xs font-semibold rounded border ${
                      isDark ? 'bg-[#0f172a] border-[#334155]' : 'bg-[#ffffff] border-[#cbd5e1]'
                    }`}
                  />
                  <span className={`font-math ${colors.label}`}>m</span>
                </div>
              </div>

              {/* Slider continuo original para escritorio */}
              <input
                type="range"
                min="0.8"
                max="2.0"
                step="0.05"
                value={l2}
                onChange={(e) => setL2(parseFloat(e.target.value))}
                className="hidden md:block"
              />

              {/* Slider táctil para móvil */}
              <div className="flex md:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setL2((prev) => Math.max(0.8, parseFloat((Number(prev) - 0.1).toFixed(2))))}
                  className={`h-6 px-1.5 rounded border font-mono text-[9px] font-bold select-none active:scale-95 ${
                    isDark ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8]' : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
                  }`}
                  title="Reducir L2"
                >
                  -0.1
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={l2}
                    onChange={(e) => setL2(parseFloat(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setL2((prev) => Math.min(2.0, parseFloat((Number(prev) + 0.1).toFixed(2))))}
                  className={`h-6 px-1.5 rounded border font-mono text-[9px] font-bold select-none active:scale-95 ${
                    isDark ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8]' : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
                  }`}
                  title="Aumentar L2"
                >
                  +0.1
                </button>
              </div>
            </div>

            <div className={`pt-1 border-t flex justify-between text-[10px] font-math ${colors.label}`}>
              <span>Alcance total desplegado:</span>
              <strong className={colors.rText}>{(Number(l1) + Number(l2)).toFixed(2)} m</strong>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* GRUPO 3: COTAS CARTESIANAS RESULTANTES (TCP)             */}
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
            <span>Cotas Espaciales TCP</span>
            <span className={`font-mono text-[10px] ${colors.rText}`}>X - Y - Z</span>
          </div>

          <div className="p-3 space-y-2 font-math">
            {/* Cota X */}
            <div className={`p-2 rounded border flex items-center justify-between ${colors.innerCard}`}>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center ${colors.xBg}`}>
                  X
                </span>
                <span className={`text-[11px] font-sans font-medium ${colors.sublabel}`}>
                  Horizontal
                </span>
              </div>
              <div className="text-right">
                <span className={`font-bold text-sm ${colors.xText}`}>{direct.resultX}</span>
                <span className={`text-[11px] font-normal ml-1 ${colors.label}`}>m</span>
              </div>
            </div>

            {/* Cota Y */}
            <div className={`p-2 rounded border flex items-center justify-between ${colors.innerCard}`}>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center ${colors.yBg}`}>
                  Y
                </span>
                <span className={`text-[11px] font-sans font-medium ${colors.sublabel}`}>
                  Profundidad
                </span>
              </div>
              <div className="text-right">
                <span className={`font-bold text-sm ${colors.yText}`}>{direct.resultY}</span>
                <span className={`text-[11px] font-normal ml-1 ${colors.label}`}>m</span>
              </div>
            </div>

            {/* Cota Z */}
            <div className={`p-2 rounded border flex items-center justify-between ${colors.innerCard}`}>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center ${colors.zBg}`}>
                  Z
                </span>
                <span className={`text-[11px] font-sans font-medium ${colors.sublabel}`}>
                  Elevación (Altura)
                </span>
              </div>
              <div className="text-right">
                <span className={`font-bold text-sm ${colors.zText}`}>{direct.resultZ}</span>
                <span className={`text-[11px] font-normal ml-1 ${colors.label}`}>m</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* GRUPO 4: ESPECIFICACIÓN TÉCNICA DINÁMICA                 */}
        {/* ======================================================== */}
        <div
          className={`p-3 rounded border text-[11px] space-y-1.5 ${
            isDark
              ? 'bg-[#141c2b]/60 border-[#334155] text-[#cbd5e1]'
              : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'
          }`}
        >
          <div className="flex items-center justify-between font-semibold text-[#2563eb]">
            <span>Arquitectura Cinemática</span>
            <span className="font-mono text-[10px]">3R Antropomórfico</span>
          </div>
          <p className="leading-relaxed">
            Estructura serial de 3 articulaciones rotacionales (3R). La combinación del actuador de base (azimuth) y los dos servomotores coplanares de hombro y codo (elevación y flexión) genera un volumen de trabajo esférico en el espacio tridimensional R³.
          </p>
        </div>
      </div>
    </aside>
  );
}
