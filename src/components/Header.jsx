import React from 'react';
import { Sun, Moon, RotateCcw, Box } from 'lucide-react';

export default function Header({
  theme,
  toggleTheme,
  onReset,
  onSetCameraView,
}) {
  const isDark = theme === 'dark';

  return (
    <header
      className={`h-12 px-4 flex items-center justify-between border-b shrink-0 transition-colors select-none ${
        isDark
          ? 'bg-[#182234] border-[#334155] text-[#F8FAFC]'
          : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
      }`}
    >
      {/* Logotipo e Identificación */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs bg-[#ea580c] text-white shadow-sm">
          <Box className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">RoboKinetic 3D</span>
      </div>

      {/* Selector de Vistas de Cámara */}
      <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-500/20 bg-slate-500/5">
        <span
          className={`text-[11px] font-semibold mr-1 px-1 ${
            isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
          }`}
        >
          Vista:
        </span>
        <button
          onClick={() => onSetCameraView('isometric')}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Isométrica"
        >
          Isométrica
        </button>
        <button
          onClick={() => onSetCameraView('top')}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Superior (Planta)"
        >
          Planta
        </button>
        <button
          onClick={() => onSetCameraView('front')}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
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
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            isDark
              ? 'hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white'
              : 'hover:bg-[#e2e8f0] text-[#334155] hover:text-black'
          }`}
          title="Vista Lateral"
        >
          Lateral
        </button>
      </div>

      {/* Controles de la derecha: Selector de Tema y Reset */}
      <div className="flex items-center gap-2">
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
              <Moon className="w-3.5 h-3.5 text-[#ea580c]" />
              <span className="hidden sm:inline">Tema Oscuro</span>
            </>
          )}
        </button>

        {/* Botón Restablecer */}
        <button
          onClick={onReset}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
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
