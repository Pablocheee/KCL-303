import React from 'react';
import {
  Radio,
  Sliders,
  X,
  ExternalLink,
  CheckCircle,
  Activity,
  Download,
  Flame,
  Volume2,
  Cpu,
  Package,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { downloadAbletonPluginZip } from '../engine/ableton_exporter';

interface AbletonBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AbletonBridgeModal: React.FC<AbletonBridgeModalProps> = ({ isOpen, onClose }) => {
  const {
    midiOutputs,
    midiInputs,
    selectedMidiOutputId,
    selectedMidiInputId,
    selectMidiOutputPort,
    selectMidiInputPort,
    isMidiSupported,
    midiByteLog,
    testNote,
    panicMidi,
  } = useEngine();

  if (!isOpen) return null;

  const ccMappings = [
    { cc: 74, name: 'VCF Cutoff Frequency', range: '0 - 127', desc: 'Main diode ladder low-pass filter cutoff' },
    { cc: 71, name: 'VCF Resonance (Q)', range: '0 - 127', desc: 'Screaming acid squelch & entropy feedback' },
    { cc: 75, name: 'VCF Decay Time', range: '0 - 127', desc: 'Envelope decay speed modulated by thermal noise' },
    { cc: 94, name: 'Diode Drive / Distortion', range: '0 - 127', desc: 'Asymmetric saturation & memristor power' },
    { cc: 1, name: 'Modulation Wheel (TR-8S Morph)', range: '0 - 127', desc: 'Bipolar Morph: 0 = LPF, 64 = Flat, 127 = HPF / Formant' },
    { cc: 76, name: 'Quantum Electron Flux', range: '0 - 127', desc: 'Johnson-Nyquist & Poisson shot noise intensity' },
    { cc: 72, name: 'Morph Resonance Peak', range: '0 - 127', desc: 'TR-8S morph filter Q width' },
  ];

  const exportAbletonMappingJson = () => {
    const bridgeConfig = {
      name: 'Neural TB-303 to Ableton Live MIDI Bridge',
      version: '1.0.0',
      author: 'Neural Hardware Synthesizer Engine',
      midiInPort: selectedMidiInputId,
      midiOutPort: selectedMidiOutputId,
      ccMappings,
    };
    const jsonStr = JSON.stringify(bridgeConfig, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Neural_TB303_Ableton_Live_Bridge.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono">
      <div className="bg-slate-900 border-2 border-slate-600 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-base font-black tracking-wide text-white uppercase">
                Ableton Live 2-Way Plugin Bridge & MIDI Automation
              </h2>
              <div className="text-[11px] text-slate-400">
                Play notes from Ableton MIDI clips and automate all knobs via standard MIDI CCs
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadAbletonPluginZip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs border border-blue-400 transition cursor-pointer shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD PLUGIN (.ZIP)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. Quick Ableton Live Connection Guide */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-4 rounded-xl border border-emerald-500/50 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>How to route between Ableton Live & this Synthesizer (Zero Latency)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-white font-black text-[11px]">🍎 macOS Setup (IAC Driver):</div>
                <p className="text-[11px] text-slate-400">
                  1. Open <b>Audio MIDI Setup</b> → Window → Show MIDI Studio → Double-click <b>IAC Driver</b> → Check <i>Device is online</i>.
                  <br />
                  2. In Ableton Live Settings → Link / Tempo / MIDI → Enable <b>Track & Remote</b> on IAC Driver.
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-white font-black text-[11px]">🪟 Windows Setup (loopMIDI):</div>
                <p className="text-[11px] text-slate-400">
                  1. Download & run free <b>loopMIDI</b> (creates a virtual MIDI cable port named <i>loopMIDI Port</i>).
                  <br />
                  2. In Ableton Live Settings → Link / Tempo / MIDI → Enable <b>Track & Remote</b> on loopMIDI.
                </p>
              </div>
            </div>
          </div>

          {/* 2. 2-Way MIDI Port Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Port (Ableton -> Synth) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold uppercase flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>MIDI INPUT (From Ableton Live)</span>
                </span>
                <span className="text-[10px] text-slate-400">Live Notes & CCs</span>
              </div>

              <select
                value={selectedMidiInputId}
                onChange={(e) => selectMidiInputPort(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
              >
                {midiInputs.length > 0 ? (
                  midiInputs.map((dev) => (
                    <option key={dev.id} value={dev.id} className="bg-slate-900 text-white">
                      {dev.name} ({dev.manufacturer || 'Input'})
                    </option>
                  ))
                ) : (
                  <option value="">No MIDI Inputs Detected (Enable IAC / loopMIDI)</option>
                )}
              </select>
              <p className="text-[10px] text-slate-500">
                Incoming MIDI notes from Ableton MIDI clips trigger the 32-bit DSP engine immediately.
              </p>
            </div>

            {/* Output Port (Synth -> Ableton) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                  <Radio className="w-4 h-4" />
                  <span>MIDI OUTPUT (To Ableton / Hardware)</span>
                </span>
                <span className="text-[10px] text-slate-400">Sequence & Telemetry</span>
              </div>

              <select
                value={selectedMidiOutputId}
                onChange={(e) => selectMidiOutputPort(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-400 font-bold p-2 rounded-lg focus:outline-none cursor-pointer"
              >
                {midiOutputs.length > 0 ? (
                  midiOutputs.map((dev) => (
                    <option key={dev.id} value={dev.id} className="bg-slate-900 text-white">
                      {dev.name} ({dev.manufacturer || 'Output'})
                    </option>
                  ))
                ) : (
                  <option value="">No MIDI Outputs Detected</option>
                )}
              </select>
              <p className="text-[10px] text-slate-500">
                Sends 16-step sequence notes and live memristor telemetry CCs to record in Ableton.
              </p>
            </div>
          </div>

          {/* 3. MIDI CC Automation Map Table */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Ableton Live MIDI CC Automation Map</span>
              </span>

              <button
                onClick={exportAbletonMappingJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Bridge Config</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-1.5 px-2">MIDI CC</th>
                    <th className="py-1.5 px-2">Parameter Name</th>
                    <th className="py-1.5 px-2">Value Range</th>
                    <th className="py-1.5 px-2">DSP Synthesis Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {ccMappings.map((row) => (
                    <tr key={row.cc} className="hover:bg-slate-900/50">
                      <td className="py-1.5 px-2 font-bold text-amber-400">CC {row.cc}</td>
                      <td className="py-1.5 px-2 font-bold text-white">{row.name}</td>
                      <td className="py-1.5 px-2 text-slate-300">{row.range}</td>
                      <td className="py-1.5 px-2 text-slate-400">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Live MIDI Traffic Monitor */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Bidirectional MIDI Traffic Stream:</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={testNote}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer"
                >
                  Send Test C1
                </button>
                <button
                  onClick={panicMidi}
                  className="px-2 py-0.5 rounded bg-red-950 text-red-300 hover:bg-red-900 text-[10px] font-bold cursor-pointer"
                >
                  Panic Off
                </button>
              </div>
            </div>

            <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400 h-24 overflow-y-auto space-y-1">
              {midiByteLog.length > 0 ? (
                midiByteLog.map((log, idx) => (
                  <div key={idx} className="truncate">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-600">Waiting for MIDI messages from Ableton Live / Sequencer...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
