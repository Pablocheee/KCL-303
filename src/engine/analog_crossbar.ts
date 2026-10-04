/**
 * Neuromorphic Analog Crossbar Array Simulator (src/engine/analog_crossbar.ts)
 * 
 * Simulates analog in-memory computing (ReRAM / Memristor Crossbars):
 *  1. DAC (Digital-to-Analog): Converts token activations into Wordline Voltages (V_in).
 *  2. Memristor Conductance (G): Maps ternary/continuous weights into physical Conductance (Siemens / µS)
 *     using differential 2-memristor cells (G_pos - G_neg).
 *  3. Ohm's Law: Physical current at each crosspoint: I_ij = V_i * G_ij (Amperes).
 *  4. Kirchhoff's Current Law (KCL): Output current on Bitline: I_out_j = sum(I_ij).
 *  5. Physical Imperfections: Johnson-Nyquist thermal noise, cycle drift, line parasitics.
 *  6. TIA & ADC (Analog-to-Digital): Transimpedance amplifier converts current to voltage (V = I * R_f).
 */

export interface AnalogHardwareSpecs {
  vMax: number;             // Max DAC voltage (e.g. 1.0 V)
  gMax: number;             // Max memristor conductance (e.g. 100 µS = 1e-4 S)
  gMin: number;             // High-resistance state (HRS) conductance (e.g. 1 µS = 1e-6 S)
  temperatureKelvin: number; // Operating temperature (e.g. 300 K = 27°C)
  thermalNoiseStd: number;   // Johnson-Nyquist thermal noise standard deviation (Amperes)
  conductanceDriftStd: number; // Device-to-device / cycle drift ratio (e.g. 0.03 = 3%)
  tiaGainRf: number;         // Transimpedance amplifier feedback resistance (Ohms, e.g. 10 kΩ)
  adcBits: number;           // ADC quantization resolution (e.g. 8-bit or 16-bit)
}

export const DEFAULT_ANALOG_SPECS: AnalogHardwareSpecs = {
  vMax: 1.0,               // 1.0 Volt max rail
  gMax: 100e-6,            // 100 µS (10 kΩ Low Resistance State)
  gMin: 1e-6,              // 1 µS (1 MΩ High Resistance State)
  temperatureKelvin: 300,  // Room Temperature (300K)
  thermalNoiseStd: 5e-8,   // 50 nA thermal current noise floor
  conductanceDriftStd: 0.02, // 2% memristor programming variance
  tiaGainRf: 20000,        // 20 kΩ TIA gain
  adcBits: 8,              // 8-bit flash ADC
};

export interface MemristorCell {
  gPos: number; // Conductance of positive memristor (Siemens)
  gNeg: number; // Conductance of negative memristor (Siemens)
  effectiveG: number; // (gPos - gNeg)
}

export interface AnalogCrossbarTelemetry {
  inputVoltages: Float32Array;       // V_in on wordlines (Volts)
  crosspointCurrents: Float32Array;  // I_ij at sample nodes (Amperes)
  rawKirchhoffCurrents: Float32Array; // Total Bitline currents (Amperes)
  thermalNoiseCurrents: Float32Array; // Physical noise injected (Amperes)
  outputVoltages: Float32Array;      // TIA amplified voltages (Volts)
  quantizedAdcOutputs: Float32Array;  // Digitized activations
  totalPowerWatts: number;           // Instantaneous Joule heating (P = V * I)
  energyJoules: number;              // Total energy per vector pass
}

/**
 * Box-Muller Gaussian Noise Generator (simulates random electron thermal agitation)
 */
function gaussianRandom(mean = 0, std = 1): number {
  const u1 = Math.max(1e-9, Math.random());
  const u2 = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * 1. DAC: Converts normalized digital activation values [-1, +1] to Wordline Voltages [0, V_max]
 */
export function dacVoltageConversion(
  digitalInputs: Float32Array,
  specs: AnalogHardwareSpecs = DEFAULT_ANALOG_SPECS
): Float32Array {
  const len = digitalInputs.length;
  const voltages = new Float32Array(len);
  const vMax = specs.vMax;

  for (let i = 0; i < len; i++) {
    // Map digital input (e.g. ReLU activation [0, 2]) to Wordline Voltage range [0, V_max]
    const clamped = Math.max(0, Math.min(2.0, digitalInputs[i]));
    voltages[i] = (clamped / 2.0) * vMax;
  }

  return voltages;
}

/**
 * 2. Memristor Crossbar Matrix Mapping
 * Maps ternary weights {-1, 0, +1} into differential Conductance pairs (G_pos, G_neg)
 */
export function mapWeightsToConductance(
  weights: Int8Array,
  inDim: number,
  outDim: number,
  specs: AnalogHardwareSpecs = DEFAULT_ANALOG_SPECS
): MemristorCell[] {
  const totalCells = inDim * outDim;
  const crossbar: MemristorCell[] = new Array(totalCells);

  const gMax = specs.gMax;
  const gMin = specs.gMin;
  const driftStd = specs.conductanceDriftStd;

  for (let idx = 0; idx < totalCells; idx++) {
    const w = weights[idx];
    let baseGPos = gMin;
    let baseGNeg = gMin;

    if (w === 1) {
      baseGPos = gMax;
      baseGNeg = gMin;
    } else if (w === -1) {
      baseGPos = gMin;
      baseGNeg = gMax;
    } else {
      // Zero weight: both in high resistance state (HRS)
      baseGPos = gMin;
      baseGNeg = gMin;
    }

    // Add physical programming drift variance (chaotic electron behavior in oxide filament)
    const gPosActual = Math.max(gMin * 0.5, baseGPos * (1 + gaussianRandom(0, driftStd)));
    const gNegActual = Math.max(gMin * 0.5, baseGNeg * (1 + gaussianRandom(0, driftStd)));

    crossbar[idx] = {
      gPos: gPosActual,
      gNeg: gNegActual,
      effectiveG: gPosActual - gNegActual,
    };
  }

  return crossbar;
}

/**
 * 3. Analog Crossbar Forward Pass
 * 
 * Physical Simulation:
 *  - Wordlines apply input Voltages V_i.
 *  - At each crosspoint, current is generated via Ohm's Law: I_pos = V_i * G_pos, I_neg = V_i * G_neg.
 *  - Bitlines accumulate current via Kirchhoff's Current Law: I_out_pos = sum(I_pos), I_out_neg = sum(I_neg).
 *  - Differential Current: I_net = I_out_pos - I_out_neg.
 *  - Thermal Johnson-Nyquist Noise: i_noise = sqrt(4 * k_B * T * B * G_total).
 *  - TIA (Transimpedance Amplifier): V_out = I_net * R_f.
 *  - ADC: Quantizes V_out back to digital domain.
 */
export function analogCrossbarForward(
  inputActivations: Float32Array,
  memristorCrossbar: MemristorCell[],
  inDim: number,
  outDim: number,
  specs: AnalogHardwareSpecs = DEFAULT_ANALOG_SPECS
): { outputActivations: Float32Array; telemetry: AnalogCrossbarTelemetry } {
  // 1. Digital to Analog Conversion (Voltages)
  const wordlineVoltages = dacVoltageConversion(inputActivations, specs);

  // 2. Physical Current Accumulation Arrays (Amperes)
  const bitlinePosCurrents = new Float32Array(outDim);
  const bitlineNegCurrents = new Float32Array(outDim);
  const netKirchhoffCurrents = new Float32Array(outDim);
  const noiseCurrents = new Float32Array(outDim);
  const tiaOutputVoltages = new Float32Array(outDim);
  const digitizedOutputs = new Float32Array(outDim);

  let totalPowerWatts = 0;
  const sampleCrosspointCurrents = new Float32Array(Math.min(32, inDim * outDim));

  // Boltzmann constant k_B (J/K)
  const kB = 1.380649e-23;
  const bandwidthHz = 1e8; // 100 MHz analog line bandwidth
  const T = specs.temperatureKelvin;

  // 3. Kirchhoff's Current Summation along Bitline columns
  for (let col = 0; col < outDim; col++) {
    let sumIpos = 0;
    let sumIneg = 0;
    let totalConductance = 0;

    const colOffset = col * inDim;

    for (let row = 0; row < inDim; row++) {
      const v = wordlineVoltages[row];
      const cell = memristorCrossbar[colOffset + row];

      // Ohm's Law: I = V * G (Amperes)
      const iPos = v * cell.gPos;
      const iNeg = v * cell.gNeg;

      sumIpos += iPos;
      sumIneg += iNeg;
      totalConductance += (cell.gPos + cell.gNeg);

      // Joule Heating Power: P = V * I = V^2 * G (Watts)
      totalPowerWatts += (v * v * (cell.gPos + cell.gNeg));

      if (col === 0 && row < sampleCrosspointCurrents.length) {
        sampleCrosspointCurrents[row] = (iPos - iNeg);
      }
    }

    bitlinePosCurrents[col] = sumIpos;
    bitlineNegCurrents[col] = sumIneg;

    // Kirchhoff differential bitline current
    const netCurrent = sumIpos - sumIneg;
    netKirchhoffCurrents[col] = netCurrent;

    // 4. Physical Johnson-Nyquist Thermal Noise Current: i_n = sqrt(4 * k_B * T * B * G)
    const thermalNoiseVariance = 4 * kB * T * bandwidthHz * Math.max(1e-9, totalConductance);
    const noiseStd = Math.sqrt(thermalNoiseVariance) + specs.thermalNoiseStd;
    const noise = gaussianRandom(0, noiseStd);
    noiseCurrents[col] = noise;

    // Total physical current with electron noise
    const physicalCurrentWithNoise = netCurrent + noise;

    // 5. Transimpedance Amplifier (TIA): Converts Current to Voltage (V = I * R_f)
    const vTia = physicalCurrentWithNoise * specs.tiaGainRf;
    tiaOutputVoltages[col] = vTia;

    // 6. Analog-to-Digital Converter (ADC) with clipping and non-linear saturation
    const adcSteps = Math.pow(2, specs.adcBits) - 1;
    const vClipped = Math.max(-specs.vMax, Math.min(specs.vMax, vTia));
    const quantized = Math.round((vClipped / specs.vMax) * (adcSteps / 2)) / (adcSteps / 2);

    // Neuromorphic activation (e.g. ReLU / Analog Diode threshold)
    digitizedOutputs[col] = Math.max(0, quantized);
  }

  // Energy = Power * Propagation delay (~5 nanoseconds in crossbar array)
  const analogDelaySeconds = 5e-9;
  const energyJoules = totalPowerWatts * analogDelaySeconds;

  return {
    outputActivations: digitizedOutputs,
    telemetry: {
      inputVoltages: wordlineVoltages,
      crosspointCurrents: sampleCrosspointCurrents,
      rawKirchhoffCurrents: netKirchhoffCurrents,
      thermalNoiseCurrents: noiseCurrents,
      outputVoltages: tiaOutputVoltages,
      quantizedAdcOutputs: digitizedOutputs,
      totalPowerWatts: Number(totalPowerWatts.toFixed(6)),
      energyJoules: Number(energyJoules.toExponential(4)),
    },
  };
}
