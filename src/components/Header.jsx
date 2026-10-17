import React from 'react';
import { Sun, Moon, RotateCcw, Box } from 'lucide-react';

export default function Header({
  theme,
  toggleTheme,
  onReset,
  onPosePreset,
  onSetCameraView,
}) {
  const isDark = theme === 'dark';

  // Presets de posturas de ingeniería del robot 3DOF
  const poses = [
    { label: 'Home', pose: { t1: 0, t2: 70, t3: -70 }, title: 'Posición de reposo vertical compacto' },
    { label: '45°', pose: { t1: 45, t2: 35, t3: -25 }, title: 'Postura de inspección espacial' },
    { label: 'Extendido', pose: { t1: 0, t2: 0, t3: 0 }, title: 'Extensión horizontal completa' },
    { label: 'Pick', pose: { t1: 90, t2: 15, t3: -55 }, title: 'Aproximación a nivel de suelo para agarre' },
  ];

  return (
    <header
      className={`h-12 px-4 flex items-center justify-between border-b shrink-0 transition-colors select-none ${
        isDark
          ? 'bg-[#182234] border-[#334155] text-[#F8FAFC]'
          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
      }`}
    >
      {/* Logotipo e Identificación CAD */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs bg-[#2563eb] text-white shadow-sm">
          <Box className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">RoboKinetic 3D</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-medium ${
              isDark
                ? 'bg-[#1e293b] text-[#94a3b8] border border-[#334155]'
                : 'bg-[#e2e8f0] text-[#475569] border border-[#cbd5e1]'
            }`}
          >
            3 DOF<span className="hidden sm:inline"> ROBOTIC ARM</span>
          </span>
          <span
            className={`hidden xl:inline text-xs ${
              isDark ? 'text-[#94a3b8]' : 'text-[#475569]'
            }`}
          >
            | Base (J1) + Hombro (J2) + Codo (J3) · Servomotores & Cinemática 3D
          </span>
        </div>
      </div>

      {/* Vistas Rápidas de Cámara Estilo CAD */}
      <div className="hidden lg:flex items-center gap-1">
        <span
          className={`text-[11px] font-semibold mr-1.5 ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          Vistas:
        </span>
        <button
          onClick={() => onSetCameraView('isometric')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Isométrica Tridimensional"
        >
          Isométrica
        </button>
        <button
          onClick={() => onSetCameraView('top')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Superior (Planta X-Y)"
        >
          Planta (X-Y)
        </button>
        <button
          onClick={() => onSetCameraView('front')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Frontal"
        >
          Frontal
        </button>
        <button
          onClick={() => onSetCameraView('side')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Lateral (Perfil)"
        >
          Lateral
        </button>
      </div>

      {/* Controles de la derecha: Presets de postura, Selector de Tema y Reset */}
      <div className="flex items-center gap-2">
        {/* Presets de posturas */}
        <div
          className={`hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${
            isDark
              ? 'bg-[#0f172a] border-[#334155] text-[#94a3b8]'
              : 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
          }`}
        >
          <span className="text-[11px] font-semibold mr-1">Postura:</span>
          {poses.map((p) => (
            <button
              key={p.label}
              onClick={() => onPosePreset(p.pose)}
              title={p.title}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                isDark
                  ? 'hover:bg-[#1e293b] hover:text-white text-[#cbd5e1]'
                  : 'hover:bg-[#e2e8f0] hover:text-black text-[#334155]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Switch Accesible de Tema Claro / Oscuro */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            isDark
              ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white'
              : 'bg-[#ffffff] border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9] hover:text-black shadow-sm'
          }`}
          title={isDark ? 'Activar Tema Claro' : 'Activar Tema Oscuro'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="hidden sm:inline">Tema Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#2563eb]" />
              <span className="hidden sm:inline">Tema Oscuro</span>
            </>
          )}
        </button>

        {/* Botón Restablecer */}
        <button
          onClick={onReset}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            isDark
              ? 'bg-[#0f172a] border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white'
              : 'bg-[#ffffff] border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9] hover:text-black shadow-sm'
          }`}
          title="Restablecer posición inicial del robot"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Restablecer</span>
        </button>
      </div>
    </header>
  );
}
