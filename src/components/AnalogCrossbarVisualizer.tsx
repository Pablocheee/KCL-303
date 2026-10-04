import React, { useState, useMemo } from 'react';
import {
  Zap,
  Activity,
  Sliders,
  Flame,
  RefreshCw,
  ArrowRight,
  Radio,
} from 'lucide-react';
import {
  mapWeightsToConductance,
  AnalogCrossbarTelemetry,
} from '../engine/analog_crossbar';
import { useEngine } from '../context/EngineContext';

export const AnalogCrossbarVisualizer: React.FC = React.memo(() => {
  const {
    specs,
    setSpecs,
    updateSpecField,
    midiDevices,
    selectedMidiId,
    selectMidiPort,
    isMidiSupported,
    midiStatusText,
  } = useEngine();

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const GRID_SIZE = 8; // 8x8 interactive physical crossbar array

  // Raw weight matrix {-1, 0, +1}
  const [weights, setWeights] = useState<Int8Array>(() => {
    const arr = new Int8Array(GRID_SIZE * GRID_SIZE);
    for (let i = 0; i < arr.length; i++) {
      const r = Math.random();
      arr[i] = r < 0.35 ? -1 : r < 0.7 ? 1 : 0;
    }
    return arr;
  });

  // Wordline Input Voltages (0.0 V .. 1.0 V)
  const [wordlineVoltages, setWordlineVoltages] = useState<Float32Array>(() => {
    const v = new Float32Array(GRID_SIZE);
    for (let i = 0; i < GRID_SIZE; i++) {
      v[i] = Number((Math.sin((i + 1) * 0.8) * 0.45 + 0.5).toFixed(3));
    }
    return v;
  });

  const reprogramMemristors = () => {
    const newWeights = new Int8Array(GRID_SIZE * GRID_SIZE);
    for (let i = 0; i < newWeights.length; i++) {
      const r = Math.random();
      newWeights[i] = r < 0.35 ? -1 : r < 0.7 ? 1 : 0;
    }
    setWeights(newWeights);
  };

  // HARDWIRED PHYSICAL SIMULATION: Recomputes with global synchronized specs
  const { crossbarGrid, telemetry } = useMemo(() => {
    const crossbar = mapWeightsToConductance(weights, GRID_SIZE, GRID_SIZE, specs);

    const bitlinePos = new Float32Array(GRID_SIZE);
    const bitlineNeg = new Float32Array(GRID_SIZE);
    const netCurrents = new Float32Array(GRID_SIZE);
    const noiseCurrents = new Float32Array(GRID_SIZE);
    const outputVoltages = new Float32Array(GRID_SIZE);
    const quantizedOutputs = new Float32Array(GRID_SIZE);

    let totalPower = 0;
    const kB = 1.380649e-23;
    const B = 1e8;
    const T = specs.temperatureKelvin;

    for (let col = 0; col < GRID_SIZE; col++) {
      let sumPos = 0;
      let sumNeg = 0;
      let colGTotal = 0;

      for (let row = 0; row < GRID_SIZE; row++) {
        const v = wordlineVoltages[row];
        const cell = crossbar[col * GRID_SIZE + row];

        const iPos = v * cell.gPos;
        const iNeg = v * cell.gNeg;

        sumPos += iPos;
        sumNeg += iNeg;
        colGTotal += cell.gPos + cell.gNeg;

        totalPower += v * v * (cell.gPos + cell.gNeg);
      }

      bitlinePos[col] = sumPos;
      bitlineNeg[col] = sumNeg;

      const iNet = sumPos - sumNeg;
      netCurrents[col] = iNet;

      const thermalVar = 4 * kB * T * B * Math.max(1e-9, colGTotal);
      const noise = (Math.sqrt(thermalVar) + specs.thermalNoiseStd) * (Math.random() * 2 - 1);
      noiseCurrents[col] = noise;

      const vTia = (iNet + noise) * specs.tiaGainRf;
      outputVoltages[col] = vTia;

      const vClipped = Math.max(-specs.vMax, Math.min(specs.vMax, vTia));
      quantizedOutputs[col] = Math.max(0, (vClipped + specs.vMax) / (2 * specs.vMax));
    }

    const tData: AnalogCrossbarTelemetry = {
      inputVoltages: wordlineVoltages,
      crosspointCurrents: new Float32Array(GRID_SIZE * GRID_SIZE),
      rawKirchhoffCurrents: netCurrents,
      thermalNoiseCurrents: noiseCurrents,
      outputVoltages: outputVoltages,
      quantizedAdcOutputs: quantizedOutputs,
      totalPowerWatts: Number(totalPower.toFixed(6)),
      energyJoules: Number((totalPower * 5e-9).toExponential(4)),
    };

    return { crossbarGrid: crossbar, telemetry: tData };
  }, [weights, wordlineVoltages, specs]);

  const handleVoltageChange = (rowIdx: number, val: number) => {
    const updated = new Float32Array(wordlineVoltages);
    updated[rowIdx] = val;
    setWordlineVoltages(updated);
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Live Analog Crossbar Array (Physical Hardware Engine)
              </h2>
              <p className="text-xs text-slate-400">
                Direct Mathematical Binding: Ohm's Law (I = V × G) & Kirchhoff's Current Law (∑ I)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono">
              <Radio className={`w-3.5 h-3.5 ${isMidiSupported ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-slate-400">MIDI Out:</span>
              {midiDevices.length > 0 ? (
                <select
                  value={selectedMidiId}
                  onChange={(e) => selectMidiPort(e.target.value)}
                  className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer"
                >
                  {midiDevices.map((dev) => (
                    <option key={dev.id} value={dev.id} className="bg-slate-900 text-white">
                      {dev.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-amber-400">No Web MIDI Devices</span>
              )}
            </div>

            <button
              onClick={reprogramMemristors}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reprogram</span>
            </button>
          </div>
        </div>

        {/* Global Synchronized Physics Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Operating Temperature (T):</span>
              </span>
              <span className="text-rose-400 font-bold">{specs.temperatureKelvin} K ({specs.temperatureKelvin - 273}°C)</span>
            </div>
            <input
              type="range"
              min="200"
              max="450"
              value={specs.temperatureKelvin}
              onChange={(e) => updateSpecField('temperatureKelvin', parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>200 K (Liquid Nitrogen)</span>
              <span>450 K (Thermal Throttling)</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Memristor Drift Variance (σ):</span>
              </span>
              <span className="text-cyan-400 font-bold">{(specs.conductanceDriftStd * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.15"
              step="0.01"
              value={specs.conductanceDriftStd}
              onChange={(e) => updateSpecField('conductanceDriftStd', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Ideal Matrix)</span>
              <span>15% (Chaotic Oxide Filament)</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>TIA Feedback Gain (R_f):</span>
              </span>
              <span className="text-purple-400 font-bold">{(specs.tiaGainRf / 1000).toFixed(0)} kΩ</span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="2500"
              value={specs.tiaGainRf}
              onChange={(e) => updateSpecField('tiaGainRf', parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5 kΩ (Low Sens)</span>
              <span>50 kΩ (High Gain Amplification)</span>
            </div>
          </div>
        </div>

        {/* 8x8 Circuit Matrix */}
        <div className="bg-slate-950/90 rounded-lg p-4 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Physical 8×8 Crossbar Array Circuit</span>
            <span className="text-slate-500">Horizontal: Wordline Voltages | Vertical: Bitline Currents</span>
          </div>

          <div className="overflow-x-auto p-1">
            <div className="min-w-[700px] space-y-2 text-xs">
              {Array.from({ length: GRID_SIZE }).map((_, row) => {
                const vRow = wordlineVoltages[row] || 0;

                return (
                  <div key={row} className="flex items-center gap-2">
                    <div className="w-32 flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/60 border border-amber-700/60 text-amber-300 text-[11px]">
                      <span className="font-bold">V[{row}]:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={vRow}
                        onChange={(e) => handleVoltageChange(row, parseFloat(e.target.value))}
                        className="w-12 accent-amber-400 cursor-pointer"
                      />
                      <span>{vRow.toFixed(2)}V</span>
                    </div>

                    <div className="w-3 h-0.5 bg-amber-500/60"></div>

                    <div className="grid grid-cols-8 gap-2 flex-1">
                      {Array.from({ length: GRID_SIZE }).map((_, col) => {
                        const cellIdx = col * GRID_SIZE + row;
                        const cell = crossbarGrid[cellIdx];
                        const effG = cell ? cell.effectiveG * 1e6 : 0;
                        const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;

                        let style = 'bg-slate-900 border-slate-800 text-slate-400';
                        if (effG > 20) {
                          style = 'bg-emerald-950/80 border-emerald-700 text-emerald-300 font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]';
                        } else if (effG < -20) {
                          style = 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.2)]';
                        }

                        return (
                          <div
                            key={col}
                            onMouseEnter={() => setHoveredCell({ row, col })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`p-1.5 rounded border text-center transition cursor-pointer text-[10px] ${style} ${
                              isHovered ? 'ring-2 ring-cyan-400 scale-110 z-10' : ''
                            }`}
                          >
                            <div>{effG > 0 ? `+${effG.toFixed(0)}` : effG.toFixed(0)} µS</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <div className="w-32 text-[10px] text-slate-400 text-right uppercase font-bold">
                  ∑ KCL Bitlines
                </div>
                <div className="w-3"></div>
                <div className="grid grid-cols-8 gap-2 flex-1">
                  {Array.from({ length: GRID_SIZE }).map((_, col) => {
                    const iNet = telemetry.rawKirchhoffCurrents[col] * 1e6;
                    const vTia = telemetry.outputVoltages[col];

                    return (
                      <div key={col} className="p-1.5 rounded bg-slate-900 border border-slate-700 text-center text-[10px]">
                        <div className="text-cyan-300 font-black">{iNet.toFixed(1)} µA</div>
                        <div className="text-[9px] text-purple-300 mt-0.5">{vTia.toFixed(2)} V</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-md p-2.5 border border-slate-800 text-xs">
            {hoveredCell !== null && crossbarGrid.length > 0 ? (
              (() => {
                const cellIdx = hoveredCell.col * GRID_SIZE + hoveredCell.row;
                const cell = crossbarGrid[cellIdx];
                const v = wordlineVoltages[hoveredCell.row];
                const effG = cell.effectiveG;
                const current = v * effG;

                return (
                  <div className="flex flex-wrap items-center gap-2 text-slate-200">
                    <span className="text-amber-400 font-bold">Node [Row {hoveredCell.row}, Col {hoveredCell.col}]:</span>
                    <span>V = <strong className="text-white">{v.toFixed(3)} V</strong></span>
                    <span>× G = <strong className="text-cyan-300">{(effG * 1e6).toFixed(2)} µS</strong></span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ohm's Current (I = V × G) = <strong className={current >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{(current * 1e6).toFixed(2)} µA</strong></span>
                  </div>
                );
              })()
            ) : (
              <div className="text-slate-500">
                Hover over any memristor node or slide any wordline voltage above to inspect Ohm's Law in real-time.
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Energy & Physical Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">Joule Heat Power</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">
              {(telemetry.totalPowerWatts * 1000).toFixed(3)} mW
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">P = ∑ V² × G</div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">Energy per Vector</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {(telemetry.energyJoules * 1e12).toFixed(2)} pJ
            </div>
            <div className="text-[9px] text-emerald-400 mt-0.5">Ultra-low neuromorphic power</div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">Thermal Noise Floor</div>
            <div className="text-sm font-bold text-rose-400 mt-0.5">
              {(Math.abs(telemetry.thermalNoiseCurrents[0]) * 1e9).toFixed(1)} nA
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">i_n = √(4 k_B T B G)</div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">TIA Feedback Scale</div>
            <div className="text-sm font-bold text-purple-300 mt-0.5">
              {(specs.tiaGainRf / 1000).toFixed(0)} kΩ
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">V_out = I × R_f</div>
          </div>
        </div>
      </div>
    </div>
  );
});
