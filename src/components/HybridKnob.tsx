import React, { useRef, useState, useEffect, memo } from 'react';

interface HybridKnobProps {
  label: string;
  subLabel?: string;
  baseValue: number;        // 0..127 (User controlled)
  effectiveValue: number;   // 0..127 (Base + Real-time Neural Offset)
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  formatValue?: (val: number) => string;
  defaultValue?: number;
  color?: 'amber' | 'rose' | 'cyan' | 'purple' | 'red' | 'emerald';
  disableJitter?: boolean;  // When true: knob stays completely still, no twitching from step telemetry
  onChange: (newVal: number) => void;
  onDirectChange?: (newVal: number) => void;
}

export const HybridKnob: React.FC<HybridKnobProps> = memo(({
  label,
  subLabel,
  baseValue,
  effectiveValue,
  min = 0,
  max = 127,
  defaultValue = 64,
  unit = '',
  displayValue,
  formatValue,
  color = 'amber',
  disableJitter = false,
  onChange,
  onDirectChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const dragStartY = useRef<number>(0);
  const startVal = useRef<number>(baseValue);
  const knobRef = useRef<HTMLDivElement>(null);
  const currentValRef = useRef<number>(baseValue);

  // DOM Refs for ZERO React Re-render hardware-speed visual updates
  const dialPointerRef = useRef<SVGGElement>(null);
  const baseArcRef = useRef<SVGPathElement>(null);
  const effArcRef = useRef<SVGPathElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onDirectChangeRef = useRef(onDirectChange);
  onDirectChangeRef.current = onDirectChange;

  const formatValueRef = useRef(formatValue);
  formatValueRef.current = formatValue;

  // SVG Arc Geometry Helpers (center = 40,40)
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, arcSweep, 0, end.x, end.y].join(' ');
  };

  // Color mappings for knob styling & live glowing neural halo
  const colorMap = {
    amber: {
      arc: '#f59e0b',
      halo: 'rgba(245, 158, 11, 0.45)',
      glow: '#fbbf24',
      text: 'text-amber-400',
      badge: 'bg-amber-950/90 border-amber-800/80 text-amber-300',
    },
    rose: {
      arc: '#f43f5e',
      halo: 'rgba(244, 63, 94, 0.45)',
      glow: '#fb7185',
      text: 'text-rose-400',
      badge: 'bg-rose-950/90 border-rose-800/80 text-rose-300',
    },
    cyan: {
      arc: '#06b6d4',
      halo: 'rgba(6, 182, 212, 0.45)',
      glow: '#22d3ee',
      text: 'text-cyan-400',
      badge: 'bg-cyan-950/90 border-cyan-800/80 text-cyan-300',
    },
    purple: {
      arc: '#a855f7',
      halo: 'rgba(168, 85, 247, 0.45)',
      glow: '#c084fc',
      text: 'text-purple-400',
      badge: 'bg-purple-950/90 border-purple-800/80 text-purple-300',
    },
    red: {
      arc: '#ef4444',
      halo: 'rgba(239, 68, 68, 0.45)',
      glow: '#f87171',
      text: 'text-red-400',
      badge: 'bg-red-950/90 border-red-800/80 text-red-300',
    },
    emerald: {
      arc: '#10b981',
      halo: 'rgba(16, 185, 129, 0.45)',
      glow: '#34d399',
      text: 'text-emerald-400',
      badge: 'bg-emerald-950/90 border-emerald-800/80 text-emerald-300',
    },
  }[color];

  // 1. POINTER EVENTS DRAG HANDLER (Desktop Mouse, Trackpad & Mobile Touch Screens)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    dragStartY.current = e.clientY;
    startVal.current = baseValue;
    currentValRef.current = baseValue;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    let latestClamped = baseValue;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Delta Y: Moving UP increases value; moving DOWN decreases value
      const deltaY = dragStartY.current - moveEvent.clientY;
      const range = max - min;
      // 150px vertical drag for full range
      const sensitivity = range / 150;
      const rawCalculated = startVal.current + deltaY * sensitivity;
      const clamped = Math.max(min, Math.min(max, Math.round(rawCalculated)));

      latestClamped = clamped;
      currentValRef.current = clamped;

      // 1. DIRECT 0ms AUDIO UPDATE (Zero React re-render, Zero CPU overhead)
      if (onDirectChangeRef.current) {
        onDirectChangeRef.current(clamped);
      }

      // 2. DIRECT DOM VISUAL ROTATION (Hardware accelerated, Zero lag)
      const norm = Math.max(0, Math.min(1.0, (clamped - min) / (max - min)));
      const angle = -135 + norm * 270;

      if (dialPointerRef.current) {
        dialPointerRef.current.setAttribute('transform', `rotate(${angle} 40 40)`);
      }
      if (baseArcRef.current) {
        baseArcRef.current.setAttribute('d', describeArc(40, 40, 31, -135, Math.max(-134, angle)));
      }
      if (effArcRef.current) {
        effArcRef.current.setAttribute('d', describeArc(40, 40, 36, -135, Math.max(-134, angle)));
      }

      const formatted = formatValueRef.current
        ? formatValueRef.current(clamped)
        : (displayValue || `${clamped}${unit ? ` ${unit}` : ''}`);

      if (readoutRef.current) {
        readoutRef.current.textContent = formatted;
      }
      if (tooltipRef.current) {
        tooltipRef.current.textContent = formatted;
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      // Final commit on release
      onChangeRef.current(latestClamped);
      setIsDragging(false);

      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {
        // Ignored
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // 2. MOUSE WHEEL MICRO-TUNING (Scroll wheel to increment/decrement)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const step = e.deltaY < 0 ? 2 : -2;
    const clamped = Math.max(min, Math.min(max, baseValue + step));
    if (onDirectChangeRef.current) {
      onDirectChangeRef.current(clamped);
    }
    onChange(clamped);
  };

  // 3. DOUBLE CLICK TO RESET DEFAULT
  const handleDoubleClick = () => {
    if (onDirectChangeRef.current) {
      onDirectChangeRef.current(defaultValue);
    }
    onChange(defaultValue);
  };

  // Calculate Rotational Angles (270-degree range: -135deg to +135deg)
  const normBase = Math.max(0, Math.min(1.0, (baseValue - min) / (max - min)));
  const baseAngle = -135 + normBase * 270;

  const actualEffectiveValue = disableJitter ? baseValue : effectiveValue;
  const normEff = Math.max(0, Math.min(1.0, (actualEffectiveValue - min) / (max - min)));
  const effAngle = -135 + normEff * 270;

  const baseArcPath = describeArc(40, 40, 31, -135, Math.max(-134, baseAngle));
  const effArcPath = describeArc(40, 40, 36, -135, Math.max(-134, effAngle));

  const delta = disableJitter ? 0 : effectiveValue - baseValue;

  // Formatted display value
  const currentFormatted = formatValue
    ? formatValue(baseValue)
    : (displayValue || `${baseValue}${unit ? ` ${unit}` : ''}`);

  return (
    <div className="flex flex-col items-center select-none font-mono group touch-none">
      {/* Knob Label */}
      <div className="text-[10px] font-black uppercase text-slate-800 tracking-wider mb-1 text-center">
        {label}
      </div>

      {/* Interactive Rotary Dial */}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className={`relative w-20 h-20 cursor-ns-resize touch-none flex items-center justify-center ${
          isDragging ? 'scale-105' : 'hover:scale-105 active:scale-105'
        }`}
        title={`${label}: Base ${baseValue} | Effective ${effectiveValue}${unit ? ` ${unit}` : ''} (Drag up/down or scroll wheel)`}
      >
        <svg className="w-full h-full pointer-events-none" viewBox="0 0 80 80">
          {/* Background Outer Ring Track */}
          <circle cx="40" cy="40" r="36" fill="none" stroke="#64748b" strokeWidth="2.5" opacity="0.3" />

          {/* Background Inner Ring Track */}
          <circle cx="40" cy="40" r="31" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.4" />

          {/* 1. Real-Time Neural Modulation Halo (Outer Glowing Dynamic Arc) */}
          <path
            ref={effArcRef}
            d={effArcPath}
            fill="none"
            stroke={colorMap.glow}
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{
              filter: disableJitter ? undefined : `drop-shadow(0 0 4px ${colorMap.glow})`,
              opacity: 0.9,
            }}
          />

          {/* 2. Static User Base Setting Arc (Inner Solid Arc) */}
          <path
            ref={baseArcRef}
            d={baseArcPath}
            fill="none"
            stroke={colorMap.arc}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* 3. Solid Metallic Rotary Knob Body */}
          <circle
            cx="40"
            cy="40"
            r="23"
            fill="url(#knobMetalGradient)"
            stroke="#0f172a"
            strokeWidth="2"
            className="shadow-md"
          />

          {/* User Base Pointer Line */}
          <g ref={dialPointerRef} transform={`rotate(${baseAngle} 40 40)`}>
            <rect x="38.5" y="19" width="3" height="9" rx="1.5" fill="#ffffff" />
            <circle cx="40" cy="20" r="1.5" fill={colorMap.arc} />
          </g>

          {/* Live Neural Modulation Target Indicator Dot (only in live jitter mode) */}
          {!disableJitter && Math.abs(delta) > 1 && (
            <g transform={`rotate(${effAngle} 40 40)`}>
              <circle cx="40" cy="5" r="2.5" fill={colorMap.glow} className="animate-ping" />
              <circle cx="40" cy="5" r="2.5" fill={colorMap.glow} />
            </g>
          )}

          <defs>
            <radialGradient id="knobMetalGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
        </svg>

        {/* Small Value Tooltip On Drag */}
        {isDragging && (
          <div
            ref={tooltipRef}
            className="absolute -top-7 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none animate-fadeIn"
          >
            {currentFormatted}
          </div>
        )}
      </div>

      {/* Sublabel / CC Description */}
      {subLabel && (
        <div className="text-[9px] text-slate-500 font-bold mt-0.5 text-center">
          {subLabel}
        </div>
      )}

      {/* Display Value Tag */}
      <div
        ref={readoutRef}
        className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorMap.badge} text-center min-w-[54px]`}
      >
        {currentFormatted}
      </div>
    </div>
  );
});
