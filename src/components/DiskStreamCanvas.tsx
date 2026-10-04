import React, { useEffect, useRef } from 'react';
import type { LayerStats } from '../engine/types';

interface DiskStreamCanvasProps {
  currentLayer: LayerStats | null;
  activeLayerIdx: number | null;
  isStreaming: boolean;
  totalLayers: number;
}

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  val: number; // -1, 0, +1
  color: string;
  progress: number;
}

export const DiskStreamCanvas: React.FC<DiskStreamCanvasProps> = ({
  currentLayer,
  activeLayerIdx,
  isStreaming,
  totalLayers = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 240);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 240;
    };
    window.addEventListener('resize', handleResize);

    // Particle spawning during streaming
    let lastSpawn = 0;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Background Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Positions
      const ssdBox = { x: 30, y: 35, w: 160, h: 170 };
      const ramBox = { x: width / 2 - 80, y: 35, w: 160, h: 170 };
      const cpuBox = { x: width - 190, y: 35, w: 160, h: 170 };

      // 1. Draw SSD / Storage Box
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(ssdBox.x, ssdBox.y, ssdBox.w, ssdBox.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('STORAGE (SSD .bin)', ssdBox.x + 14, ssdBox.y + 24);
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('fs.promises.read()', ssdBox.x + 14, ssdBox.y + 38);

      // Draw SSD Sectors
      const sectors = [
        { name: 'Layer 1 (0B)', offset: '0 KB', size: '128 KB', active: activeLayerIdx === 0 },
        { name: 'Layer 2 (131KB)', offset: '131 KB', size: '256 KB', active: activeLayerIdx === 1 },
        { name: 'Layer 3 (393KB)', offset: '393 KB', size: '64 KB', active: activeLayerIdx === 2 },
      ];

      sectors.forEach((sec, idx) => {
        const sy = ssdBox.y + 50 + idx * 36;
        ctx.fillStyle = sec.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)';
        ctx.strokeStyle = sec.active ? '#10b981' : '#334155';
        ctx.lineWidth = sec.active ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(ssdBox.x + 10, sy, ssdBox.w - 20, 30, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = sec.active ? '#34d399' : '#94a3b8';
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillText(sec.name, ssdBox.x + 16, sy + 14);
        ctx.fillStyle = '#64748b';
        ctx.font = '9px "Fira Code", monospace';
        ctx.fillText(`Size: ${sec.size}`, ssdBox.x + 16, sy + 25);
      });

      // 2. Draw RAM / Transient Buffer Box
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = activeLayerIdx !== null ? '#38bdf8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(ramBox.x, ramBox.y, ramBox.w, ramBox.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('TRANSIENT RAM CHUNK', ramBox.x + 12, ramBox.y + 24);
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Zero-OOM Buffer Slice', ramBox.x + 12, ramBox.y + 38);

      // RAM Buffer internal state
      const ramChunkY = ramBox.y + 50;
      const ramChunkH = 75;
      ctx.fillStyle = activeLayerIdx !== null ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.4)';
      ctx.strokeStyle = activeLayerIdx !== null ? '#38bdf8' : '#334155';
      ctx.beginPath();
      ctx.roundRect(ramBox.x + 10, ramChunkY, ramBox.w - 20, ramChunkH, 6);
      ctx.fill();
      ctx.stroke();

      if (activeLayerIdx !== null && currentLayer) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.fillText(`Int8[${(currentLayer.byteLength / 1024).toFixed(0)} KB]`, ramBox.x + 16, ramChunkY + 22);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "Fira Code", monospace';
        ctx.fillText(`Offset: ${currentLayer.offset.toLocaleString()} B`, ramBox.x + 16, ramChunkY + 38);
        ctx.fillText(`Neurons: ${currentLayer.inSize} → ${currentLayer.outSize}`, ramBox.x + 16, ramChunkY + 52);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Read: ${currentLayer.readTimeMs}ms`, ramBox.x + 16, ramChunkY + 66);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillText('Buffer Idle / Evaporated', ramBox.x + 16, ramChunkY + 38);
        ctx.fillText('GC Cleared (0 KB)', ramBox.x + 16, ramChunkY + 54);
      }

      // GC Indicator badge
      const gcY = ramBox.y + 132;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.beginPath();
      ctx.roundRect(ramBox.x + 10, gcY, ramBox.w - 20, 26, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = '9px "Fira Code", monospace';
      ctx.fillText('♻️ V8 GC Auto-Reclaim', ramBox.x + 16, gcY + 16);

      // 3. Draw CPU / Dual-Core ALU Box
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cpuBox.x, cpuBox.y, cpuBox.w, cpuBox.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('DUAL-CORE i5 ALUs', cpuBox.x + 14, cpuBox.y + 24);
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('BitNet Ternary Kernel', cpuBox.x + 14, cpuBox.y + 38);

      // Core 0 & Core 1
      const coreH = 48;
      ['Core 0 (Add/Sub)', 'Core 1 (Add/Sub)'].forEach((coreName, cIdx) => {
        const cy = cpuBox.y + 50 + cIdx * 56;
        ctx.fillStyle = activeLayerIdx !== null ? 'rgba(245, 158, 11, 0.15)' : 'rgba(30, 41, 59, 0.4)';
        ctx.strokeStyle = activeLayerIdx !== null ? '#f59e0b' : '#334155';
        ctx.beginPath();
        ctx.roundRect(cpuBox.x + 10, cy, cpuBox.w - 20, coreH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = activeLayerIdx !== null ? '#fbbf24' : '#94a3b8';
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillText(coreName, cpuBox.x + 16, cy + 18);

        ctx.font = '9px "Fira Code", monospace';
        if (activeLayerIdx !== null && currentLayer) {
          ctx.fillStyle = '#10b981';
          ctx.fillText(`+ Add: ${(currentLayer.additions / 2).toFixed(0)}`, cpuBox.x + 16, cy + 32);
          ctx.fillStyle = '#f43f5e';
          ctx.fillText(`- Sub: ${(currentLayer.subtractions / 2).toFixed(0)}`, cpuBox.x + 85, cy + 32);
          ctx.fillStyle = '#64748b';
          ctx.fillText(`FLOPs: ZERO`, cpuBox.x + 16, cy + 44);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.fillText('0 Mults / Standby', cpuBox.x + 16, cy + 34);
        }
      });

      // 4. Data Bus / Arrows between boxes
      // SSD -> RAM Bus
      ctx.strokeStyle = isStreaming ? 'rgba(56, 189, 248, 0.6)' : 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ssdBox.x + ssdBox.w, ssdBox.y + 85);
      ctx.lineTo(ramBox.x, ramBox.y + 85);
      ctx.stroke();

      // RAM -> CPU Bus
      ctx.strokeStyle = isStreaming ? 'rgba(245, 158, 11, 0.6)' : 'rgba(51, 65, 85, 0.4)';
      ctx.beginPath();
      ctx.moveTo(ramBox.x + ramBox.w, ramBox.y + 85);
      ctx.lineTo(cpuBox.x, cpuBox.y + 85);
      ctx.stroke();
      ctx.setLineDash([]);

      // Spawn particles if streaming
      if (isStreaming && time - lastSpawn > 60) {
        lastSpawn = time;
        const vals = [-1, 0, 1];
        const val = vals[Math.floor(Math.random() * vals.length)];
        const color = val === 1 ? '#10b981' : val === -1 ? '#f43f5e' : '#64748b';

        // SSD -> RAM particle
        particlesRef.current.push({
          x: ssdBox.x + ssdBox.w,
          y: ssdBox.y + 85 + (Math.random() * 20 - 10),
          targetX: ramBox.x,
          targetY: ramBox.y + 85 + (Math.random() * 20 - 10),
          speed: 0.04 + Math.random() * 0.02,
          val,
          color,
          progress: 0,
        });

        // RAM -> CPU particle
        particlesRef.current.push({
          x: ramBox.x + ramBox.w,
          y: ramBox.y + 85 + (Math.random() * 20 - 10),
          targetX: cpuBox.x,
          targetY: cpuBox.y + 85 + (Math.random() * 20 - 10),
          speed: 0.04 + Math.random() * 0.02,
          val,
          color,
          progress: 0,
        });
      }

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const currX = p.x + (p.targetX - p.x) * p.progress;
        const currY = p.y + (p.targetY - p.y) * p.progress;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(currX, currY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Only schedule next frame if streaming is active or particles are still finishing animation
      if (isStreaming || particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        animFrameRef.current = null;
      }
    };

    // Initial render
    render(performance.now());

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentLayer, activeLayerIdx, isStreaming]);

  return (
    <div className="w-full bg-[#0a0f18] rounded-xl border border-slate-800 p-3 sm:p-4 shadow-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isStreaming ? 'bg-emerald-400' : 'bg-slate-500'
              } opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isStreaming ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            ></span>
          </span>
          <h2 className="text-sm font-semibold text-slate-200">
            Disk-Streaming Memory Pipeline (SSD → Transient Buffer → ALU Core)
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-300">+1 Add</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="text-slate-300">-1 Sub</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>
            <span className="text-slate-400">0 Skip</span>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <canvas ref={canvasRef} className="w-full block" style={{ minWidth: '600px', height: '240px' }} />
      </div>
    </div>
  );
};
