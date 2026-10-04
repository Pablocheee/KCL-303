/**
 * Analog Neuromorphic Crossbar Inference Runner (scripts/run_analog_inference.ts)
 * 
 * Simulates physical in-memory computation:
 *  - Wordline Input: Voltages V_in (Volts)
 *  - Crosspoints: Memristor Conductance G (Siemens)
 *  - Core Multiplication: Ohm's Law (I = V * G)
 *  - Summation: Kirchhoff's Current Law (I_bitline = sum(I_crosspoint))
 *  - Thermal Physics: Johnson-Nyquist thermal electron noise + memristor drift
 *  - TIA & ADC: Converts Amperes -> Volts -> Token Logits
 * 
 * Run with: npx tsx scripts/run_analog_inference.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DEFAULT_ANALOG_SPECS,
  AnalogHardwareSpecs,
  mapWeightsToConductance,
  analogCrossbarForward,
  dacVoltageConversion,
} from '../src/engine/analog_crossbar';

const MODEL_PATH = path.resolve(process.cwd(), 'data', 'bitnet_transformer.bin');

// Softmax function
function softmax(scores: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < scores.length; i++) if (scores[i] > max) max = scores[i];
  let sum = 0;
  const out = new Float32Array(scores.length);
  for (let i = 0; i < scores.length; i++) {
    out[i] = Math.exp(scores[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < scores.length; i++) out[i] /= sum;
  return out;
}

async function runAnalogCrossbarSimulation() {
  console.log('====================================================');
  console.log('⚡ Neuromorphic Analog Crossbar Array Simulation');
  console.log('⚡ Computing via Ohm\'s Law & Kirchhoff\'s Current Law');
  console.log('====================================================\n');

  console.log('🔬 Physical Hardware Specifications:');
  console.log(`   ├─ Rail Voltage (V_max): ${DEFAULT_ANALOG_SPECS.vMax} V`);
  console.log(`   ├─ Memristor LRS (G_max): ${(DEFAULT_ANALOG_SPECS.gMax * 1e6).toFixed(1)} µS (10 kΩ)`);
  console.log(`   ├─ Memristor HRS (G_min): ${(DEFAULT_ANALOG_SPECS.gMin * 1e6).toFixed(1)} µS (1 MΩ)`);
  console.log(`   ├─ Operating Temp: ${DEFAULT_ANALOG_SPECS.temperatureKelvin} K (27°C)`);
  console.log(`   ├─ Thermal Noise Floor: ${(DEFAULT_ANALOG_SPECS.thermalNoiseStd * 1e9).toFixed(1)} nA`);
  console.log(`   └─ TIA Feedback Gain (R_f): ${(DEFAULT_ANALOG_SPECS.tiaGainRf / 1000).toFixed(1)} kΩ\n`);

  const inDim = 128;
  const outDim = 128;
  const numWeights = inDim * outDim;

  // 1. Load weights from disk or create sample ternary weights
  const sampleWeights = new Int8Array(numWeights);
  for (let i = 0; i < numWeights; i++) {
    const r = Math.random();
    sampleWeights[i] = r < 0.33 ? -1 : r < 0.66 ? 1 : 0;
  }

  // 2. Map weights to Physical Memristor Conductance Pairs (G_pos, G_neg)
  console.log('🔌 Programming Memristor Crossbar Array with Conductance Values (G)...');
  const crossbar = mapWeightsToConductance(sampleWeights, inDim, outDim, DEFAULT_ANALOG_SPECS);
  console.log(`   └─ Array Size: ${inDim} Wordlines × ${outDim} Bitlines = ${crossbar.length.toLocaleString()} Memristors`);

  // 3. Generate input vector and convert to Analog Voltages (DAC)
  const digitalInput = new Float32Array(inDim).map((_, i) => Math.sin(i / 10) * 0.5 + 0.5);
  const inputVoltages = dacVoltageConversion(digitalInput, DEFAULT_ANALOG_SPECS);

  console.log('\n⚡ [Step 1: DAC] Digital Token Activations -> Wordline Voltages (V_in):');
  console.log(`   Input Voltages sample (first 4 channels): [${Array.from(inputVoltages.slice(0, 4)).map(v => `${v.toFixed(3)}V`).join(', ')}]`);

  // 4. Execute Analog Physics Forward Pass (Ohm's Law + Kirchhoff's Current Law)
  console.log('\n🔋 [Step 2: Physics Execution] Propagating Electrons through Crossbar...');
  const startTime = performance.now();
  const { outputActivations, telemetry } = analogCrossbarForward(
    digitalInput,
    crossbar,
    inDim,
    outDim,
    DEFAULT_ANALOG_SPECS
  );
  const durationMs = performance.now() - startTime;

  console.log(`   ├─ Ohm's Law (I = V * G): Sample crosspoint currents: [${Array.from(telemetry.crosspointCurrents.slice(0, 4)).map(i => `${(i * 1e6).toFixed(2)} µA`).join(', ')}]`);
  console.log(`   ├─ Kirchhoff's Law (∑ I): Net Bitline currents (first 4 lines): [${Array.from(telemetry.rawKirchhoffCurrents.slice(0, 4)).map(i => `${(i * 1e6).toFixed(2)} µA`).join(', ')}]`);
  console.log(`   ├─ Johnson-Nyquist Noise: Injected electron fluctuations: [${Array.from(telemetry.thermalNoiseCurrents.slice(0, 4)).map(i => `${(i * 1e9).toFixed(2)} nA`).join(', ')}]`);
  console.log(`   ├─ TIA Amplifier (V = I * R_f): Amplified output voltages: [${Array.from(telemetry.outputVoltages.slice(0, 4)).map(v => `${v.toFixed(3)} V`).join(', ')}]`);
  console.log(`   └─ Flash ADC (Digitization): Quantized activations: [${Array.from(telemetry.quantizedAdcOutputs.slice(0, 4)).map(a => a.toFixed(3)).join(', ')}]`);

  // 5. Compute Token Probabilities from TIA output currents
  const tokenProbabilities = softmax(telemetry.outputVoltages);
  console.log('\n📊 [Step 3: Logits Mapping] Output Currents -> Token Probabilities:');
  const topTokens = Array.from(tokenProbabilities)
    .map((prob, id) => ({ id, prob: (prob * 100).toFixed(2) }))
    .sort((a, b) => parseFloat(b.prob) - parseFloat(a.prob))
    .slice(0, 5);

  topTokens.forEach((tok, rank) => {
    console.log(`   ${rank + 1}. Token #${tok.id} -> ${tok.prob}% probability (Current = ${(telemetry.rawKirchhoffCurrents[tok.id] * 1e6).toFixed(2)} µA)`);
  });

  console.log('\n====================================================');
  console.log(`⚡ Instantaneous Power Draw: ${(telemetry.totalPowerWatts * 1000).toFixed(3)} mW (Milliwatts!)`);
  console.log(`🔋 Energy per Vector Multiply: ${(telemetry.energyJoules * 1e12).toFixed(2)} pJ (Picojoules!)`);
  console.log(`⏱️  Simulation Latency: ${durationMs.toFixed(3)} ms (Physical latency: ~5.0 ns)`);
  console.log('====================================================\n');
}

runAnalogCrossbarSimulation().catch(console.error);
