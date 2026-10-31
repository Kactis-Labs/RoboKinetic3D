import React from 'react';
import { Sliders, Cpu, Ruler, Play, Square, RotateCcw, GripHorizontal, Box } from 'lucide-react';

export default function PropertyManager({
  theme,
  theta1Deg,
  setTheta1Deg,
  theta2Deg,
  setTheta2Deg,
  theta3Deg,
  setTheta3Deg,
  gripperAperture = 38,
  setGripperAperture,
  l1,
  setL1,
  l2,
  setL2,
  telemetry,
  onPosePreset,
  mobileTab = 'split',
  routineStatus = 'IDLE',
  currentStepIndex = 0,
  totalSteps = 10,
  statusMessage = '',
  cubeLocation = 'pick',
  onStartRoutine,
  onStopRoutine,
  onResetCube,
}) {
  const isDark = theme === 'dark';
  const { direct } = telemetry;

  // Handlers seguros para inputs numéricos
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

  const handleGripperInput = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && setGripperAperture) {
      setGripperAperture(Math.max(0, Math.min(40, val)));
    }
  };

  const handleL1Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setL1(Math.max(1.2, Math.min(2.4, val)));
  };

  const handleL2Input = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setL2(Math.max(1.0, Math.min(2.0, val)));
  };

  // Paleta de contraste calibrada
  const colors = {
    xText: isDark ? 'text-[#34d399]' : 'text-[#047857]',
    yText: isDark ? 'text-[#818cf8]' : 'text-[#4338ca]',
    zText: isDark ? 'text-[#fbbf24]' : 'text-[#b45309]',
    rText: isDark ? 'text-[#60a5fa]' : 'text-[#1d4ed8]',
    label: isDark ? 'text-[#94a3b8]' : 'text-[#64748b]',
    value: isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]',
    cardBg: isDark ? 'bg-[#1e293b]/55 border-[#334155]' : 'bg-[#ffffff] border-[#cbd5e1] shadow-xs',
    headerBg: isDark ? 'bg-[#141c2b] border-[#334155]' : 'bg-[#f8fafc] border-[#cbd5e1]',
    inputBg: isDark ? 'bg-[#0f172a] border-[#334155] text-[#f8fafc]' : 'bg-[#ffffff] border-[#cbd5e1] text-[#0f172a]',
    divider: isDark ? 'border-[#334155]/60' : 'border-[#cbd5e1]/70',
  };

  return (
    <aside
      className={`${
        mobileTab === 'split'
          ? 'flex-1 min-h-0 flex flex-col overflow-hidden md:flex-none'
          : mobileTab === '3d'
          ? 'hidden md:flex md:flex-col md:flex-none'
          : 'hidden md:flex md:flex-col md:flex-none'
      } w-full md:w-[275px] lg:w-[290px] md:h-full border-r md:shrink-0 transition-colors select-none text-xs font-sans ${
        isDark ? 'bg-[#182234] border-[#334155] text-[#F8FAFC]' : 'bg-[#f8fafc] border-[#CBD5E1] text-[#0F172A]'
      }`}
    >
      {/* Encabezado compacto */}
      <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${colors.headerBg}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#ea580c] text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-2.5 h-2.5" />
          </div>
          <span className="font-semibold text-xs tracking-tight">PropertyManager</span>
        </div>
      </div>

      {/* Contenedor scrolleable optimizado para táctil y escritorio */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5 touch-pan-y overscroll-contain">
        {/* ======================================================== */}
        {/* 1. AUTOMATIZACIÓN PICK & PLACE                           */}
        {/* ======================================================== */}
        <div className={`rounded-md border overflow-hidden ${colors.cardBg}`}>
          <div className={`px-2.5 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${colors.headerBg}`}>
            <div className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Rutina Pick & Place</span>
            </div>
            <span
              className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                routineStatus === 'RUNNING'
                  ? 'bg-[#ea580c] text-white animate-pulse'
                  : routineStatus === 'COMPLETED'
                  ? 'bg-[#10b981] text-white'
                  : isDark
                  ? 'bg-[#0f172a] text-[#94a3b8]'
                  : 'bg-[#e2e8f0] text-[#475569]'
              }`}
            >
              {routineStatus === 'RUNNING' ? 'En Proceso' : routineStatus === 'COMPLETED' ? 'Listo' : 'Reposo'}
            </span>
          </div>

          <div className="p-2 space-y-1.5">
            {/* Botón Principal */}
            {routineStatus === 'RUNNING' ? (
              <button
                type="button"
                onClick={onStopRoutine}
                className="w-full py-1.5 px-2 rounded bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Detener Rutina</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartRoutine}
                className="w-full py-1.5 px-2 rounded bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Iniciar Rutina Pick & Place</span>
              </button>
            )}

            {/* Sub-fila compacta */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onResetCube}
                disabled={routineStatus === 'RUNNING'}
                className={`flex-1 py-1 px-1.5 rounded border text-[10px] font-medium flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 ${
                  isDark ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1] hover:text-white' : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155] hover:text-black'
                }`}
                title="Restablece el cubo en la Zona Pick"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset Cubo</span>
              </button>

              <div
                className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center gap-1 ${
                  cubeLocation === 'gripped'
                    ? 'bg-[#d97706]/15 border-[#d97706]/30 text-[#d97706] font-semibold'
                    : cubeLocation === 'place'
                    ? 'bg-[#a855f7]/15 border-[#a855f7]/30 text-[#a855f7] font-semibold'
                    : isDark
                    ? 'bg-[#0f172a] border-[#334155] text-[#38bdf8]'
                    : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0284c7]'
                }`}
              >
                <span>Cubo:</span>
                <span className="capitalize font-bold">{cubeLocation === 'gripped' ? 'Sujeto' : cubeLocation}</span>
              </div>
            </div>

            {/* Progreso activo */}
            {routineStatus !== 'IDLE' && (
              <div className="pt-0.5 space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="truncate max-w-[170px] text-[#2563eb] font-semibold">{statusMessage}</span>
                  <span className="opacity-75">{currentStepIndex + 1}/{totalSteps}</span>
                </div>
                <div className="w-full h-1 rounded-full bg-slate-500/20 overflow-hidden">
                  <div
                    className="h-full bg-[#2563eb] transition-all duration-300"
                    style={{ width: `${Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. EFECTOR FINAL (PINZA / GRIPPER DE 2 DEDOS)            */}
        {/* ======================================================== */}
        <div className={`rounded-md border overflow-hidden ${colors.cardBg}`}>
          <div className={`px-2.5 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${colors.headerBg}`}>
            <div className="flex items-center gap-1.5">
              <GripHorizontal className="w-3.5 h-3.5 text-[#84cc16]" />
              <span>Pinza Industrial (Gripper)</span>
            </div>
            <span className={`font-mono text-[9px] font-bold text-[#84cc16]`}>
              {Number(gripperAperture).toFixed(1)} mm
            </span>
          </div>

          <div className="p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="40"
                step="0.5"
                value={gripperAperture}
                disabled={routineStatus === 'RUNNING'}
                onChange={(e) => setGripperAperture(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="40"
                step="0.5"
                value={Number(gripperAperture).toFixed(1)}
                onChange={handleGripperInput}
                disabled={routineStatus === 'RUNNING'}
                className={`w-[54px] px-1.5 py-0.5 text-right font-math text-[11px] font-semibold rounded border ${colors.inputBg}`}
              />
            </div>

            {/* Accesos rápidos compactos */}
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setGripperAperture(0)}
                disabled={routineStatus === 'RUNNING'}
                className={`py-0.5 rounded text-[9px] font-medium border text-center transition-all ${
                  gripperAperture <= 2
                    ? 'bg-[#ea580c] text-white border-[#ea580c]'
                    : isDark ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1]' : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'
                }`}
              >
                Cerrar (0)
              </button>
              <button
                type="button"
                onClick={() => setGripperAperture(14)}
                disabled={routineStatus === 'RUNNING'}
                className={`py-0.5 rounded text-[9px] font-medium border text-center transition-all ${
                  gripperAperture >= 12 && gripperAperture <= 16
                    ? 'bg-[#ea580c] text-white border-[#ea580c]'
                    : isDark ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1]' : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'
                }`}
              >
                Neutro (14)
              </button>
              <button
                type="button"
                onClick={() => setGripperAperture(29)}
                disabled={routineStatus === 'RUNNING'}
                className={`py-0.5 rounded text-[9px] font-medium border text-center transition-all ${
                  gripperAperture >= 28 && gripperAperture <= 30
                    ? 'bg-[#ea580c] text-white border-[#ea580c]'
                    : isDark ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1]' : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'
                }`}
              >
                Cubo (29)
              </button>
              <button
                type="button"
                onClick={() => setGripperAperture(38)}
                disabled={routineStatus === 'RUNNING'}
                className={`py-0.5 rounded text-[9px] font-medium border text-center transition-all ${
                  gripperAperture >= 36
                    ? 'bg-[#ea580c] text-white border-[#ea580c]'
                    : isDark ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1]' : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'
                }`}
              >
                Abrir (38)
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. ARTICULACIONES                                         */}
        {/* ======================================================== */}
        <div className={`rounded-md border overflow-hidden ${colors.cardBg}`}>
          <div className={`px-2.5 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${colors.headerBg}`}>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Articulaciones</span>
            </div>
            <span className={`font-mono text-[9px] ${colors.rText}`}>Ángulos</span>
          </div>

          <div className="p-2 space-y-2">
            {/* J1 Base */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[11px]">J1 Base:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step="0.5"
                    value={Number(theta1Deg).toFixed(1)}
                    onChange={handleTheta1Input}
                    disabled={routineStatus === 'RUNNING'}
                    className={`w-[58px] px-1.5 py-0.5 text-right font-math text-[11px] font-semibold rounded border ${colors.inputBg}`}
                  />
                  <span className={colors.label}>°</span>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={theta1Deg}
                disabled={routineStatus === 'RUNNING'}
                onChange={(e) => setTheta1Deg(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className={`border-t ${colors.divider}`} />

            {/* J2 Hombro */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[11px]">J2 Hombro:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-20"
                    max="100"
                    step="0.5"
                    value={Number(theta2Deg).toFixed(1)}
                    onChange={handleTheta2Input}
                    disabled={routineStatus === 'RUNNING'}
                    className={`w-[58px] px-1.5 py-0.5 text-right font-math text-[11px] font-semibold rounded border ${colors.inputBg}`}
                  />
                  <span className={colors.label}>°</span>
                </div>
              </div>
              <input
                type="range"
                min="-20"
                max="100"
                step="0.5"
                value={theta2Deg}
                disabled={routineStatus === 'RUNNING'}
                onChange={(e) => setTheta2Deg(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className={`border-t ${colors.divider}`} />

            {/* J3 Codo */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[11px]">J3 Codo:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-120"
                    max="60"
                    step="0.5"
                    value={Number(theta3Deg).toFixed(1)}
                    onChange={handleTheta3Input}
                    disabled={routineStatus === 'RUNNING'}
                    className={`w-[58px] px-1.5 py-0.5 text-right font-math text-[11px] font-semibold rounded border ${colors.inputBg}`}
                  />
                  <span className={colors.label}>°</span>
                </div>
              </div>
              <input
                type="range"
                min="-120"
                max="60"
                step="0.5"
                value={theta3Deg}
                disabled={routineStatus === 'RUNNING'}
                onChange={(e) => setTheta3Deg(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. ESLABONES                                             */}
        {/* ======================================================== */}
        <div className={`rounded-md border overflow-hidden ${colors.cardBg}`}>
          <div className={`px-2.5 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold ${colors.headerBg}`}>
            <div className="flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Eslabones</span>
            </div>
            <span className={`text-[9px] font-mono ${colors.label}`}>L₀=0.6m | R={(Number(l1) + Number(l2)).toFixed(2)}m</span>
          </div>

          <div className="p-2 space-y-2">
            {/* L1 */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">L₁ (Brazo):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1.2"
                    max="2.4"
                    step="0.05"
                    value={Number(l1).toFixed(2)}
                    onChange={handleL1Input}
                    className={`w-[54px] px-1.5 py-0.5 text-right font-math text-[11px] font-semibold rounded border ${colors.inputBg}`}
                  />
                  <span className={colors.label}>m</span>
                </div>
              </div>
              <input
                type="range"
                min="1.2"
                max="2.4"
                step="0.05"
                value={l1}
                onChange={(e) => setL1(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* L2 */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">L₂ (Antebrazo):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={Number(l2).toFixed(2)}
                    onChange={handleL2Input}
                    className={`w-[54px] px-1.5 py-0.5 text-right font-math text-[11px] font-semibold rounded border ${colors.inputBg}`}
                  />
                  <span className={colors.label}>m</span>
                </div>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={l2}
                onChange={(e) => setL2(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. COTAS CARTESIANAS RESULTANTES (TCP) EN FILA COMPACTA  */}
        {/* ======================================================== */}
        <div className={`rounded-md border p-2 ${colors.cardBg}`}>
          <div className="flex items-center justify-between pb-1 border-b mb-1.5 border-inherit text-[10px] font-semibold">
            <span className={colors.label}>Coordenadas TCP</span>
            <span className={`font-mono text-[9px] ${colors.rText}`}>r_xy: {direct.resultRGround}m</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 font-math text-center">
            <div className={`p-1 rounded border ${isDark ? 'bg-[#0f172a] border-[#334155]' : 'bg-[#f1f5f9] border-[#cbd5e1]'}`}>
              <span className="text-[9px] block font-sans font-bold text-emerald-500">X</span>
              <span className={`font-bold text-xs ${colors.xText}`}>{direct.resultX}</span>
            </div>
            <div className={`p-1 rounded border ${isDark ? 'bg-[#0f172a] border-[#334155]' : 'bg-[#f1f5f9] border-[#cbd5e1]'}`}>
              <span className="text-[9px] block font-sans font-bold text-indigo-500">Y</span>
              <span className={`font-bold text-xs ${colors.yText}`}>{direct.resultY}</span>
            </div>
            <div className={`p-1 rounded border ${isDark ? 'bg-[#0f172a] border-[#334155]' : 'bg-[#f1f5f9] border-[#cbd5e1]'}`}>
              <span className="text-[9px] block font-sans font-bold text-amber-500">Z</span>
              <span className={`font-bold text-xs ${colors.zText}`}>{direct.resultZ}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
