import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Touchpad as TouchpadIcon,
  Flame,
  Disc,
  Sparkles,
  Waves,
  Lock,
  Unlock,
  Crosshair,
  Maximize2,
  RefreshCw,
  Zap,
  Smartphone,
  Sliders,
  AudioWaveform,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';
import { dspAudio } from '../engine/dsp_audio_engine';

type SoundProfile = 'acid_climax' | 'scream_drive' | 'deep_sub' | 'balanced';

export const TB303Touchpad: React.FC = () => {
  const { t } = useLanguage();
  const {
    baseCutoffCC,
    baseResonanceCC,
    baseEnvModCC,
    baseDecayCC,
    baseAccentCC,
    baseDriveCC,
    setAllBaseKnobsCC,
    morphAmount,
    isMorphEnabled,
    morphType,
    morphResonance,
  } = useEngine();

  // State
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [isHold, setIsHold] = useState(true);
  const [soundProfile, setSoundProfile] = useState<SoundProfile>('acid_climax');
  const [multiTouchCount, setMultiTouchCount] = useState<number>(0);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // DOM Refs for ZERO-LATENCY hardware-accelerated updates (bypasses React re-renders)
  const padRef = useRef<HTMLDivElement | null>(null);
  const padRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const crosshairHRef = useRef<HTMLDivElement | null>(null);
  const crosshairVRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);

  // Meter Bar Refs
  const cutoffMeterRef = useRef<HTMLDivElement | null>(null);
  const resoMeterRef = useRef<HTMLDivElement | null>(null);
  const envModMeterRef = useRef<HTMLDivElement | null>(null);
  const driveMeterRef = useRef<HTMLDivElement | null>(null);
  const decayMeterRef = useRef<HTMLDivElement | null>(null);
  const morphMeterRef = useRef<HTMLDivElement | null>(null);

  // Text Readout Refs
  const cutoffTextRef = useRef<HTMLDivElement | null>(null);
  const resoTextRef = useRef<HTMLDivElement | null>(null);
  const envModTextRef = useRef<HTMLDivElement | null>(null);
  const driveTextRef = useRef<HTMLDivElement | null>(null);
  const decayTextRef = useRef<HTMLDivElement | null>(null);
  const morphTextRef = useRef<HTMLDivElement | null>(null);
  const hudFeedbackRef = useRef<HTMLSpanElement | null>(null);

  // Corner HUD text refs
  const cornerXRef = useRef<HTMLSpanElement | null>(null);
  const cornerYRef = useRef<HTMLSpanElement | null>(null);
  const cornerDecayRef = useRef<HTMLSpanElement | null>(null);
  const cornerDriveRef = useRef<HTMLSpanElement | null>(null);

  // State refs for calculations
  const coordsRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const virtualPosRef = useRef<{ x: number; y: number }>({ x: 300, y: 120 });
  const lastSyncTimestampRef = useRef<number>(0);

  // Cache pad bounding rect to prevent forced synchronous layout reflows during moves
  const updatePadRect = useCallback(() => {
    if (padRef.current) {
      const r = padRef.current.getBoundingClientRect();
      padRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  }, []);

  useEffect(() => {
    updatePadRect();
    window.addEventListener('resize', updatePadRect);
    window.addEventListener('scroll', updatePadRect, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePadRect);
      window.removeEventListener('scroll', updatePadRect);
    };
  }, [updatePadRect]);

  // Single ripple on touch down (prevents array thrashing during move)
  const triggerRipple = (xPx: number, yPx: number) => {
    const id = Date.now();
    setRipples([{ id, x: xPx, y: yPx }]);
    setTimeout(() => {
      setRipples([]);
    }, 600);
  };

  /**
   * DIRECT HIGH-PERFORMANCE AUDIO & DOM UPDATE (Zero Lag, 120 FPS Smooth)
   */
  const processSimultaneousMotion = useCallback(
    (normX: number, normY: number, secondDist: number = 0) => {
      const clampedX = Math.max(0, Math.min(1, normX));
      const clampedY = Math.max(0, Math.min(1, normY));
      coordsRef.current = { x: clampedX, y: clampedY };

      let nextCutoff = 0;
      let nextReso = 0;
      let nextEnvMod = 0;
      let nextDrive = 0;
      let nextDecay = 0;
      let nextMorph = 0;
      let nextAccent = 0;

      if (soundProfile === 'acid_climax') {
        // Classic Acid Squelch: Full 6-filter synergy
        nextCutoff = Math.round((clampedX * 0.85 + clampedY * 0.15) * 127);
        nextReso = Math.round((clampedY * 0.85 + clampedX * 0.15) * 127);
        nextEnvMod = Math.round(Math.min(1, clampedY * 0.75 + clampedX * 0.35) * 127);
        const cornerDist = Math.pow((clampedX * 0.6 + clampedY * 0.4), 1.3);
        nextDrive = Math.round(Math.min(1, cornerDist) * 127);
        nextDecay = Math.round((0.15 + (1 - clampedY) * 0.45 + clampedX * 0.4) * 127);
        nextMorph = Math.round((clampedX * 2 - 1) * 100);
        nextAccent = Math.round(clampedY * clampedX * 127);
      } else if (soundProfile === 'scream_drive') {
        nextCutoff = Math.round(clampedX * 127);
        nextReso = Math.round(Math.max(0.4, clampedY) * 127);
        nextEnvMod = Math.round(clampedY * 127);
        nextDrive = Math.round((0.35 + clampedX * 0.4 + clampedY * 0.25) * 127);
        nextDecay = Math.round((0.2 + clampedX * 0.6) * 127);
        nextMorph = Math.round((clampedX * 2 - 1) * 100);
        nextAccent = Math.round(clampedY * 127);
      } else if (soundProfile === 'deep_sub') {
        nextCutoff = Math.round(clampedX * 0.6 * 127);
        nextReso = Math.round(clampedY * 0.5 * 127);
        nextEnvMod = Math.round((clampedY * 0.4 + clampedX * 0.2) * 127);
        nextDrive = Math.round(clampedX * clampedY * 0.5 * 127);
        nextDecay = Math.round((0.4 + (1 - clampedY) * 0.6) * 127);
        nextMorph = Math.round(-100 + clampedX * 100);
        nextAccent = Math.round(clampedX * 100);
      } else {
        nextCutoff = Math.round(clampedX * 127);
        nextReso = Math.round(clampedY * 127);
        nextEnvMod = Math.round((clampedY * 0.7 + clampedX * 0.3) * 127);
        nextDrive = Math.round(Math.pow(clampedX * clampedY, 0.7) * 127);
        nextDecay = Math.round((0.25 + clampedX * 0.5) * 127);
        nextMorph = Math.round((clampedX * 2 - 1) * 100);
        nextAccent = Math.round(clampedY * 0.8 * 127);
      }

      if (secondDist > 0) {
        const boost = Math.min(127, Math.round((secondDist / 180) * 127));
        nextDrive = Math.max(nextDrive, boost);
        nextAccent = Math.max(nextAccent, boost);
      }

      // 1. INSTANT DIRECT DSP AUDIO HARDWARE UPDATE (0ms latency, zero re-renders)
      const realCutoff = 200 + (nextCutoff / 127) * 3300;
      const realResonance = 2 + (nextReso / 127) * 22;
      const realDecay = 0.08 + (nextDecay / 127) * 0.50;
      const realDrive = nextDrive / 127;
      const realEnvMod = nextEnvMod / 127;
      const realAccent = nextAccent / 127;

      dspAudio.setBaseKnobs(realCutoff, realResonance, realDecay, realEnvMod, realAccent, realDrive);
      if (isMorphEnabled) {
        dspAudio.setMorphFilter(nextMorph / 100, morphType, morphResonance);
      }

      // 2. DIRECT HARDWARE-ACCELERATED DOM TRANSFORM UPDATES (60-120 FPS smooth)
      const xPct = (clampedX * 100).toFixed(2);
      const yPct = ((1 - clampedY) * 100).toFixed(2);

      if (crosshairVRef.current) crosshairVRef.current.style.left = `${xPct}%`;
      if (crosshairHRef.current) crosshairHRef.current.style.top = `${yPct}%`;
      if (reticleRef.current) {
        reticleRef.current.style.left = `${xPct}%`;
        reticleRef.current.style.top = `${yPct}%`;
      }

      // Update Meter Bars
      if (cutoffMeterRef.current) cutoffMeterRef.current.style.width = `${(nextCutoff / 127) * 100}%`;
      if (resoMeterRef.current) resoMeterRef.current.style.width = `${(nextReso / 127) * 100}%`;
      if (envModMeterRef.current) envModMeterRef.current.style.width = `${(nextEnvMod / 127) * 100}%`;
      if (driveMeterRef.current) driveMeterRef.current.style.width = `${(nextDrive / 127) * 100}%`;
      if (decayMeterRef.current) decayMeterRef.current.style.width = `${(nextDecay / 127) * 100}%`;
      if (morphMeterRef.current) morphMeterRef.current.style.width = `${(nextMorph + 100) / 2}%`;

      // Update Texts
      const hzVal = Math.round(realCutoff);
      const qVal = realResonance.toFixed(1);
      const envPct = Math.round(realEnvMod * 100);
      const drivePct = Math.round(realDrive * 100);
      const decayMs = Math.round(realDecay * 1000);

      if (cutoffTextRef.current) cutoffTextRef.current.textContent = `${hzVal} Hz`;
      if (resoTextRef.current) resoTextRef.current.textContent = `${qVal} Q`;
      if (envModTextRef.current) envModTextRef.current.textContent = `${envPct}%`;
      if (driveTextRef.current) driveTextRef.current.textContent = `${drivePct}%`;
      if (decayTextRef.current) decayTextRef.current.textContent = `${decayMs} ms`;
      if (morphTextRef.current) morphTextRef.current.textContent = nextMorph > 0 ? `+${nextMorph}% HPF` : `${nextMorph}% LPF`;

      if (cornerXRef.current) cornerXRef.current.textContent = `${hzVal} Hz`;
      if (cornerYRef.current) cornerYRef.current.textContent = `${qVal} Q • ${envPct}%`;
      if (cornerDecayRef.current) cornerDecayRef.current.textContent = `${decayMs} ms`;
      if (cornerDriveRef.current) cornerDriveRef.current.textContent = `${drivePct}% Drive • ${Math.round(realAccent * 100)}% Acc`;

      if (hudFeedbackRef.current) {
        hudFeedbackRef.current.textContent = `Cutoff ${hzVal}Hz • Reso ${qVal}Q • Drive ${drivePct}% • Env ${envPct}%`;
      }
    },
    [soundProfile, isMorphEnabled, morphType, morphResonance]
  );

  // Sync back to React context ONLY when finger is lifted / gesture ends to preserve final state (0% CPU during drag)
  const flushFinalStateToContext = useCallback(() => {
    const { x, y } = coordsRef.current;
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    let nextCutoff = 0;
    let nextReso = 0;
    let nextEnvMod = 0;
    let nextDrive = 0;
    let nextDecay = 0;
    let nextMorph = 0;
    let nextAccent = 0;

    if (soundProfile === 'acid_climax') {
      nextCutoff = Math.round((clampedX * 0.85 + clampedY * 0.15) * 127);
      nextReso = Math.round((clampedY * 0.85 + clampedX * 0.15) * 127);
      nextEnvMod = Math.round(Math.min(1, clampedY * 0.75 + clampedX * 0.35) * 127);
      const cornerDist = Math.pow((clampedX * 0.6 + clampedY * 0.4), 1.3);
      nextDrive = Math.round(Math.min(1, cornerDist) * 127);
      nextDecay = Math.round((0.15 + (1 - clampedY) * 0.45 + clampedX * 0.4) * 127);
      nextMorph = Math.round((clampedX * 2 - 1) * 100);
      nextAccent = Math.round(clampedY * clampedX * 127);
    } else if (soundProfile === 'scream_drive') {
      nextCutoff = Math.round(clampedX * 127);
      nextReso = Math.round(Math.max(0.4, clampedY) * 127);
      nextEnvMod = Math.round(clampedY * 127);
      nextDrive = Math.round((0.35 + clampedX * 0.4 + clampedY * 0.25) * 127);
      nextDecay = Math.round((0.2 + clampedX * 0.6) * 127);
      nextMorph = Math.round((clampedX * 2 - 1) * 100);
      nextAccent = Math.round(clampedY * 127);
    } else if (soundProfile === 'deep_sub') {
      nextCutoff = Math.round(clampedX * 0.6 * 127);
      nextReso = Math.round(clampedY * 0.5 * 127);
      nextEnvMod = Math.round((clampedY * 0.4 + clampedX * 0.2) * 127);
      nextDrive = Math.round(clampedX * clampedY * 0.5 * 127);
      nextDecay = Math.round((0.4 + (1 - clampedY) * 0.6) * 127);
      nextMorph = Math.round(-100 + clampedX * 100);
      nextAccent = Math.round(clampedX * 100);
    } else {
      nextCutoff = Math.round(clampedX * 127);
      nextReso = Math.round(clampedY * 127);
      nextEnvMod = Math.round((clampedY * 0.7 + clampedX * 0.3) * 127);
      nextDrive = Math.round(Math.pow(clampedX * clampedY, 0.7) * 127);
      nextDecay = Math.round((0.25 + clampedX * 0.5) * 127);
      nextMorph = Math.round((clampedX * 2 - 1) * 100);
      nextAccent = Math.round(clampedY * 0.8 * 127);
    }

    setAllBaseKnobsCC(
      nextCutoff,
      nextReso,
      nextDecay,
      nextEnvMod,
      nextAccent,
      nextDrive,
      isMorphEnabled ? nextMorph : undefined
    );
  }, [soundProfile, isMorphEnabled, setAllBaseKnobsCC]);

  const flushFinalStateRef = useRef(flushFinalStateToContext);
  flushFinalStateRef.current = flushFinalStateToContext;

  const processSimultaneousMotionRef = useRef(processSimultaneousMotion);
  processSimultaneousMotionRef.current = processSimultaneousMotion;

  // =========================================================================
  // 1. SMARTPHONE DIRECT TOUCH (Touch events with touch-action: none)
  // =========================================================================
  useEffect(() => {
    const padEl = padRef.current;
    if (!padEl) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.touches.length === 0) return;
      updatePadRect();
      const rect = padRectRef.current || padEl.getBoundingClientRect();
      const t1 = e.touches[0];

      const xPx = t1.clientX - rect.left;
      const yPx = t1.clientY - rect.top;
      const normX = Math.max(0, Math.min(1, xPx / rect.width));
      const normY = Math.max(0, Math.min(1, 1 - yPx / rect.height));

      setIsTouchActive(true);
      setMultiTouchCount(e.touches.length);
      triggerRipple(xPx, yPx);

      let secondDist = 0;
      if (e.touches.length >= 2) {
        const t2 = e.touches[1];
        secondDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }

      processSimultaneousMotionRef.current(normX, normY, secondDist);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.touches.length === 0) return;
      const rect = padRectRef.current || padEl.getBoundingClientRect();
      const t1 = e.touches[0];

      const xPx = t1.clientX - rect.left;
      const yPx = t1.clientY - rect.top;
      const normX = Math.max(0, Math.min(1, xPx / rect.width));
      const normY = Math.max(0, Math.min(1, 1 - yPx / rect.height));

      let secondDist = 0;
      if (e.touches.length >= 2) {
        const t2 = e.touches[1];
        secondDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }

      processSimultaneousMotionRef.current(normX, normY, secondDist);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setMultiTouchCount(e.touches.length);

      if (e.touches.length === 0) {
        setIsTouchActive(false);
        if (!isHold) {
          processSimultaneousMotionRef.current(0.5, 0.5, 0);
        }
        flushFinalStateRef.current();
      }
    };

    padEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    padEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    padEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    padEl.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      padEl.removeEventListener('touchstart', handleTouchStart);
      padEl.removeEventListener('touchmove', handleTouchMove);
      padEl.removeEventListener('touchend', handleTouchEnd);
      padEl.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isHold, updatePadRect]);

  // =========================================================================
  // 2. DESKTOP TRACKPAD: POINTER LOCK WITH INSTANT MOUSE CLICK EXIT
  // =========================================================================
  const lockTimestampRef = useRef<number>(0);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === padRef.current;
      setIsPointerLocked(locked);

      if (locked && padRef.current) {
        lockTimestampRef.current = performance.now();
        updatePadRect();
        const rect = padRectRef.current || padRef.current.getBoundingClientRect();
        virtualPosRef.current = {
          x: rect.width * coordsRef.current.x,
          y: rect.height * (1 - coordsRef.current.y),
        };
      } else {
        flushFinalStateRef.current();
      }
    };

    const handlePointerLockError = () => {
      setIsPointerLocked(false);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
    };
  }, [updatePadRect]);

  // Exit pointer lock immediately on any mouse click/down while locked
  useEffect(() => {
    if (!isPointerLocked) return;

    const handleExitOnClick = (e: MouseEvent) => {
      // Prevent instant exit if click was part of the lock initiation (grace period of 80ms)
      if (performance.now() - lockTimestampRef.current > 80) {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    };

    window.addEventListener('mousedown', handleExitOnClick, { capture: true });
    window.addEventListener('click', handleExitOnClick, { capture: true });
    return () => {
      window.removeEventListener('mousedown', handleExitOnClick, { capture: true });
      window.removeEventListener('click', handleExitOnClick, { capture: true });
    };
  }, [isPointerLocked]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked || !padRef.current) return;
      const rect = padRectRef.current || padRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      virtualPosRef.current.x = Math.max(0, Math.min(width, virtualPosRef.current.x + e.movementX));
      virtualPosRef.current.y = Math.max(0, Math.min(height, virtualPosRef.current.y + e.movementY));

      const normX = virtualPosRef.current.x / width;
      const normY = 1 - virtualPosRef.current.y / height;

      processSimultaneousMotionRef.current(normX, normY, 0);
    };

    if (isPointerLocked) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPointerLocked]);

  // Wheel gestures (2-finger trackpad scroll on laptops)
  useEffect(() => {
    const padEl = padRef.current;
    if (!padEl) return;

    let wheelTimeout: any = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const speed = 0.003;
      const nextX = Math.max(0, Math.min(1, coordsRef.current.x + e.deltaX * speed));
      const nextY = Math.max(0, Math.min(1, coordsRef.current.y - e.deltaY * speed));

      processSimultaneousMotion(nextX, nextY, 0);

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(flushFinalStateToContext, 200);
    };

    padEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      clearTimeout(wheelTimeout);
      padEl.removeEventListener('wheel', onWheel);
    };
  }, [processSimultaneousMotion, flushFinalStateToContext]);

  const togglePointerLock = async () => {
    if (document.pointerLockElement === padRef.current) {
      document.exitPointerLock();
    } else {
      if (padRef.current) {
        try {
          await padRef.current.requestPointerLock();
        } catch (err) {
          console.warn('Pointer lock request error:', err);
        }
      }
    }
  };

  // Direct Mouse Drag on Desktop
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (isPointerLocked) return;

    updatePadRect();
    const rect = padRectRef.current || padRef.current?.getBoundingClientRect();
    if (!rect) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsTouchActive(true);

    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, xPx / rect.width));
    const normY = Math.max(0, Math.min(1, 1 - yPx / rect.height));

    triggerRipple(xPx, yPx);
    processSimultaneousMotion(normX, normY, 0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (isPointerLocked || !isTouchActive) return;

    const rect = padRectRef.current || padRef.current?.getBoundingClientRect();
    if (!rect) return;

    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, xPx / rect.width));
    const normY = Math.max(0, Math.min(1, 1 - yPx / rect.height));

    processSimultaneousMotion(normX, normY, 0);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (isPointerLocked) return;

    setIsTouchActive(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (!isHold) {
      processSimultaneousMotion(0.5, 0.5, 0);
    }
    flushFinalStateToContext();
  };

  // Initial values for meters on mount
  const initialCutoffHz = Math.round(200 + (baseCutoffCC / 127) * 3300);
  const initialResoQ = (2 + (baseResonanceCC / 127) * 22).toFixed(1);
  const initialEnvModPct = Math.round((baseEnvModCC / 127) * 100);
  const initialDecayMs = Math.round(80 + (baseDecayCC / 127) * 500);
  const initialDrivePct = Math.round((baseDriveCC / 127) * 100);

  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-200 p-3 sm:p-4 text-white font-mono space-y-3.5 shadow-2xl max-w-full overflow-hidden ${
        isPointerLocked
          ? 'bg-slate-950 border-amber-400 ring-4 ring-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.5)]'
          : 'bg-slate-950 border-slate-700'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400">
            <TouchpadIcon className={`w-5 h-5 ${isPointerLocked || isTouchActive ? 'animate-bounce text-amber-300' : ''}`} />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span>{t('touchpadTitle')}</span>
              {isPointerLocked ? (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] animate-pulse">
                  {t('touchpadMouseLocked')}
                </span>
              ) : isTouchActive ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] animate-pulse">
                  {t('touchpadSensorActive')} {multiTouchCount > 1 ? `(${multiTouchCount} P)` : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold text-[10px]">
                  {t('touchpadTouchpad')}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              {t('touchpadSub')}
            </div>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={togglePointerLock}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg border ${
              isPointerLocked
                ? 'bg-red-600 hover:bg-red-500 text-white border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
            }`}
            title="Lock Mouse: laptop trackpad turns into XY touch surface"
          >
            <Crosshair className="w-4 h-4" />
            <span>{isPointerLocked ? t('touchpadUnlockBtn') : t('touchpadLockBtn')}</span>
          </button>

          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setSoundProfile('acid_climax')}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition ${
                soundProfile === 'acid_climax' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Acid Climax
            </button>
            <button
              onClick={() => setSoundProfile('scream_drive')}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition ${
                soundProfile === 'scream_drive' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scream Drive
            </button>
            <button
              onClick={() => setSoundProfile('deep_sub')}
              className={`px-2 py-1 rounded font-bold cursor-pointer transition ${
                soundProfile === 'deep_sub' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Deep Sub
            </button>
          </div>

          <button
            onClick={() => setIsHold(!isHold)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
              isHold ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title={isHold ? t('touchpadHoldOn') : t('touchpadHoldOff')}
          >
            {isHold ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>HOLD</span>
          </button>
        </div>
      </div>

      {/* 2. LIVE SIMULTANEOUS 6-FILTER KINETIC METERS (Direct DOM, Zero Re-renders) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
        {/* Cutoff Meter */}
        <div className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-purple-900/60">
          <div className="text-[10px] font-black text-purple-400">1. CUTOFF</div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-slate-800">
            <div
              ref={cutoffMeterRef}
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full will-change-[width]"
              style={{ width: `${(baseCutoffCC / 127) * 100}%` }}
            />
          </div>
          <div ref={cutoffTextRef} className="text-xs font-black text-purple-300">
            {initialCutoffHz} Hz
          </div>
        </div>

        {/* Resonance Meter */}
        <div className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-amber-900/60">
          <div className="text-[10px] font-black text-amber-400">2. RESONANCE</div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-slate-800">
            <div
              ref={resoMeterRef}
              className="h-full bg-gradient-to-r from-amber-600 to-amber-300 rounded-full will-change-[width]"
              style={{ width: `${(baseResonanceCC / 127) * 100}%` }}
            />
          </div>
          <div ref={resoTextRef} className="text-xs font-black text-amber-300">
            {initialResoQ} Q
          </div>
        </div>

        {/* Env Mod Meter */}
        <div className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-red-900/60">
          <div className="text-[10px] font-black text-red-400">3. ENV MOD</div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-slate-800">
            <div
              ref={envModMeterRef}
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full will-change-[width]"
              style={{ width: `${initialEnvModPct}%` }}
            />
          </div>
          <div ref={envModTextRef} className="text-xs font-black text-red-300">
            {initialEnvModPct}%
          </div>
        </div>

        {/* Overdrive Meter */}
        <div className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-cyan-900/60">
          <div className="text-[10px] font-black text-cyan-400">4. DRIVE</div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-slate-800">
            <div
              ref={driveMeterRef}
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full will-change-[width]"
              style={{ width: `${initialDrivePct}%` }}
            />
          </div>
          <div ref={driveTextRef} className="text-xs font-black text-cyan-300">
            {initialDrivePct}%
          </div>
        </div>

        {/* Decay Meter */}
        <div className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-rose-900/60">
          <div className="text-[10px] font-black text-rose-400">5. DECAY</div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-slate-800">
            <div
              ref={decayMeterRef}
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full will-change-[width]"
              style={{ width: `${(baseDecayCC / 127) * 100}%` }}
            />
          </div>
          <div ref={decayTextRef} className="text-xs font-black text-rose-300">
            {initialDecayMs} ms
          </div>
        </div>

        {/* Morph Meter */}
        <div className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-emerald-900/60">
          <div className="text-[10px] font-black text-emerald-400">6. MORPH</div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden my-1 border border-slate-800">
            <div
              ref={morphMeterRef}
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-full will-change-[width]"
              style={{ width: `${(morphAmount + 100) / 2}%` }}
            />
          </div>
          <div ref={morphTextRef} className="text-xs font-black text-emerald-300">
            {morphAmount > 0 ? `+${morphAmount}% HPF` : `${morphAmount}% LPF`}
          </div>
        </div>
      </div>

      {/* 3. TACTILE HARDWARE TOUCHPAD SURFACE (Hardware Accelerated 120 FPS) */}
      <div
        ref={padRef}
        onClick={() => {
          if (!isPointerLocked) togglePointerLock();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-black border-2 select-none overflow-hidden cursor-crosshair box-border shadow-[inset_0_0_50px_rgba(0,0,0,0.95)] touch-none ${
          isPointerLocked
            ? 'border-amber-400'
            : isTouchActive
            ? 'border-emerald-400 ring-2 ring-emerald-500/50'
            : 'border-slate-700 hover:border-slate-500'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Retro Grid Lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(to_right,#38bdf820_1px,transparent_1px),linear-gradient(to_bottom,#38bdf820_1px,transparent_1px)] bg-[size:28px_28px]" />

        {/* Dynamic Laser Crosshairs with will-change GPU acceleration */}
        <div
          ref={crosshairVRef}
          className="absolute top-0 bottom-0 w-px bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,1)] pointer-events-none will-change-[left]"
          style={{ left: '50%' }}
        />
        <div
          ref={crosshairHRef}
          className="absolute left-0 right-0 h-px bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,1)] pointer-events-none will-change-[top]"
          style={{ top: '50%' }}
        />

        {/* Shockwave Ripple on tap down */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute rounded-full border-2 border-amber-300 pointer-events-none animate-ping"
            style={{
              left: `${ripple.x - 30}px`,
              top: `${ripple.y - 30}px`,
              width: 60,
              height: 60,
            }}
          />
        ))}

        {/* Glowing Tactile Orb Cursor */}
        <div
          ref={reticleRef}
          className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 border-white flex items-center justify-center pointer-events-none will-change-[left,top] ${
            isTouchActive || isPointerLocked
              ? 'bg-amber-400/90 shadow-[0_0_30px_rgba(251,191,36,1)] ring-4 ring-amber-300/80 scale-125'
              : 'bg-amber-500/60 shadow-[0_0_16px_rgba(251,191,36,0.6)]'
          }`}
          style={{ left: '50%', top: '50%' }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
        </div>

        {/* Corner HUD Indicators */}
        <div className="absolute top-2.5 left-2.5 pointer-events-none flex flex-col gap-0.5 bg-slate-950/85 p-2 rounded-lg border border-purple-500/40 text-[10px] font-mono shadow">
          <span className="text-purple-400 font-black">X: CUTOFF & MORPH</span>
          <span ref={cornerXRef} className="text-slate-300">
            {initialCutoffHz} Hz
          </span>
        </div>

        <div className="absolute top-2.5 right-2.5 pointer-events-none flex flex-col gap-0.5 bg-slate-950/85 p-2 rounded-lg border border-amber-500/40 text-[10px] font-mono shadow text-right">
          <span className="text-amber-400 font-black">Y: RESONANCE & ENV</span>
          <span ref={cornerYRef} className="text-slate-300">
            {initialResoQ} Q • {initialEnvModPct}%
          </span>
        </div>

        <div className="absolute bottom-2.5 left-2.5 pointer-events-none flex flex-col gap-0.5 bg-slate-950/85 p-2 rounded-lg border border-rose-500/40 text-[10px] font-mono shadow">
          <span className="text-rose-400 font-black">DECAY TIME</span>
          <span ref={cornerDecayRef} className="text-slate-300">
            {initialDecayMs} ms
          </span>
        </div>

        <div className="absolute bottom-2.5 right-2.5 pointer-events-none flex flex-col gap-0.5 bg-slate-950/85 p-2 rounded-lg border border-cyan-500/40 text-[10px] font-mono shadow text-right">
          <span className="text-cyan-400 font-black">OVERDRIVE CLIMAX</span>
          <span ref={cornerDriveRef} className="text-slate-300">
            {initialDrivePct}% Drive
          </span>
        </div>

        {/* Smartphone Multi-Touch Banner */}
        {multiTouchCount > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-cyan-950/95 border-2 border-cyan-400 px-3 py-1 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)] pointer-events-none flex items-center gap-1.5 text-xs font-black text-cyan-300 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('multiTouchBoost')}</span>
          </div>
        )}

        {/* Pointer Lock Desktop Notification */}
        {isPointerLocked && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/95 border-2 border-red-500 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.7)] pointer-events-none flex items-center gap-2 text-xs font-black animate-fadeIn">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-white">{t('trackpadCapturedHint')}</span>
            <span className="text-red-300 text-[10px] bg-red-950/80 px-2 py-0.5 rounded border border-red-700">
              {t('trackpadExitHint')}
            </span>
          </div>
        )}

        {/* Center Guidance Watermark */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20 text-center px-4">
          <Smartphone className="w-10 h-10 text-amber-400 mb-1" />
          <div className="text-xs font-black tracking-widest uppercase text-amber-300">
            DIRECT TOUCH GLASS • TRACKPAD KINETIC SURFACE
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            {t('touchpadInstructions')}
          </div>
        </div>
      </div>

      {/* 4. Live Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin" />
          <span ref={hudFeedbackRef} className="text-amber-300 font-bold truncate">
            Cutoff {initialCutoffHz}Hz • Reso {initialResoQ}Q • Drive {initialDrivePct}% • Env {initialEnvModPct}%
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('touchpadInstructions')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
