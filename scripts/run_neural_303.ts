/**
 * Advanced Neural TB-303 MIDI Sequencer with Physical Telemetry (scripts/run_neural_303.ts)
 * 
 * Modulates TB-303 sound parameters in real-time based on simulation physics:
 *  - Token Entropy (Uncertainty) -> Filter Resonance (CC 71)
 *  - Thermal Noise (Johnson-Nyquist) -> Envelope Decay (CC 75)
 *  - Total Layer Current (Joule Power) -> Overdrive / Distortion (CC 94)
 *  - Layer Depth (1..N) -> LFO Rate / Depth Shift (CC 76)
 * 
 * Usage:
 *  npx tsx scripts/run_neural_303.ts --bpm 132 --scale c_minor_pentatonic
 */

import { NeuralTB303Sequencer, ScaleName, calculateShannonEntropy, PhysicalTelemetryData } from '../src/engine/neural_303';
import { bitnetLinearForward } from '../src/engine/bitnet';

let neuralState = new Float32Array(64).map(() => Math.random() * 2 - 1);
const weights = new Int8Array(64 * 64).map(() => (Math.random() < 0.33 ? -1 : Math.random() < 0.66 ? 1 : 0));
let currentLayer = 1;
const totalLayers = 4;

function stepNeuralSimulation(): { activations: Float32Array; telemetry: PhysicalTelemetryData } {
  const result = bitnetLinearForward(neuralState, weights, 64, 64);
  const next = result.output;

  // Softmax on output logits to calculate Shannon Entropy H(X)
  let max = -Infinity;
  for (let i = 0; i < 64; i++) if (next[i] > max) max = next[i];
  let sum = 0;
  const probs = new Float32Array(64);
  for (let i = 0; i < 64; i++) {
    probs[i] = Math.exp(next[i] - max);
    sum += probs[i];
  }
  for (let i = 0; i < 64; i++) probs[i] /= sum;

  const entropy = calculateShannonEntropy(probs);

  // Physical simulation telemetry
  const kB = 1.380649e-23;
  const T = 300; // 300 Kelvin
  const B = 1e8; // 100 MHz bandwidth
  const gTotal = 64 * 50e-6; // ~3.2 mS total line conductance
  const thermalNoiseVariance = 4 * kB * T * B * gTotal;
  const thermalNoise = Math.sqrt(thermalNoiseVariance) * Math.abs(Math.random() * 2 - 1);

  // Total Layer Current: Sum of absolute currents in mA
  let totalCurrentAmperes = 0;
  for (let i = 0; i < 64; i++) {
    totalCurrentAmperes += Math.abs(next[i]) * 50e-6; // V * G
  }

  const powerMilliwatts = totalCurrentAmperes * 1.0 * 1000;

  // Advance recurrent state
  for (let i = 0; i < 64; i++) {
    neuralState[i] = Math.tanh(next[i] * 0.1);
  }

  const telemetry: PhysicalTelemetryData = {
    entropy: Number(entropy.toFixed(3)),
    thermalNoiseAmperes: thermalNoise,
    totalCurrentAmperes: totalCurrentAmperes,
    layerIndex: currentLayer,
    totalLayers,
    powerMilliwatts: Number(powerMilliwatts.toFixed(2)),
  };

  currentLayer = (currentLayer % totalLayers) + 1;

  return {
    activations: neuralState,
    telemetry,
  };
}

// Parse CLI flags
const args = process.argv.slice(2);
let bpm = 132;
let scale: ScaleName = 'c_minor_pentatonic';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--bpm' && args[i + 1]) bpm = parseInt(args[i + 1], 10);
  if (args[i] === '--scale' && args[i + 1]) scale = args[i + 1] as ScaleName;
}

console.log('====================================================');
console.log('🎛️  Advanced Neural TB-303 MIDI & Telemetry Sequencer');
console.log('====================================================');
console.log(`⚡ Virtual MIDI Port: "Neural_303"`);
console.log(`🎵 Tempo: ${bpm} BPM (16th note clock: ${((60000 / bpm) / 4).toFixed(1)} ms/step)`);
console.log(`🎹 Scale: ${scale}`);
console.log('\n📊 Continuous Physical CC Mappings Active:');
console.log('   ├─ CC 71: Filter Resonance  <- Token Entropy (Uncertainty)');
console.log('   ├─ CC 75: Envelope Decay    <- Johnson-Nyquist Thermal Noise');
console.log('   ├─ CC 94: Overdrive Amount  <- Total Layer Current / Power');
console.log('   └─ CC 76: LFO Depth Morph   <- Layer Depth (1..4)\n');

const sequencer = new NeuralTB303Sequencer({
  bpm,
  scale,
  portName: 'Neural_303',
  gateThreshold: 0.28,
  accentThreshold: 0.72,
  slideThreshold: 0.65,
});

sequencer.setStepCallback((step) => {
  const stepNum = String(step.stepIndex + 1).padStart(2, '0');
  const gateChar = step.gate ? '🟩' : '⬛';
  const acc = step.accent ? '🔥 ACC' : '    ';
  const sld = step.slide ? '〰️ SLD' : '    ';
  const cc = step.ccState;

  console.log(
    `[Step ${stepNum}/16] ${gateChar} ${step.noteName.padEnd(4)} | ${acc} | ${sld} | ` +
    `Res(CC71):${String(cc?.resonanceCC71).padStart(3)} | ` +
    `Decay(CC75):${String(cc?.decayCC75).padStart(3)} | ` +
    `Drive(CC94):${String(cc?.distortionCC94).padStart(3)} | ` +
    `LFO(CC76):${String(cc?.depthLfoCC76).padStart(3)}`
  );
});

sequencer.start(() => stepNeuralSimulation());

process.on('SIGINT', () => {
  console.log('\nStopping sequencer...');
  sequencer.close();
  process.exit(0);
});
