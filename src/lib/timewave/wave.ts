/**
 * The timewave itself: the fractal transform of the 384 data points.
 *
 * Port of f() and v() from Peter Meyer's TW_EN.C (Timewave Zero 4.22, 1993),
 * including its precision cutoff, so values match the DOS program.
 */

export interface WaveOptions {
  dataPoints: readonly number[];
  /** The "wave factor": ratio between successive levels of the fractal. 64 in the original. */
  waveFactor?: number;
}

export interface Wave {
  readonly waveFactor: number;
  readonly dataPoints: readonly number[];
  /** Wave value for a point `daysToZero` days before the zero point (undefined past it). */
  value(daysToZero: number): number;
}

const CALC_PREC = 10;

export function createWave({ dataPoints, waveFactor = 64 }: WaveOptions): Wave {
  if (dataPoints.length < 4) throw new Error("Not enough values in data set.");
  if (!(waveFactor >= 2)) throw new RangeError("Wave factor must be at least 2.");
  const n = dataPoints.length;
  const w = dataPoints;

  const powers: number[] = [1];
  const power = (i: number): number => {
    while (powers.length <= i) powers.push(powers[powers.length - 1] * waveFactor);
    return powers[i];
  };

  // Linear interpolation between neighbouring data points, wrapping every n.
  const v = (y: number): number => {
    const i = Math.floor(y % n);
    const j = (i + 1) % n;
    const z = y - Math.floor(y);
    return z === 0 ? w[i] : (w[j] - w[i]) * z + w[i];
  };

  const f = (x: number): number => {
    let sum = 0;
    if (x) {
      // Larger scales: x/64^i for as long as x is at least 64^i.
      for (let i = 0; x >= power(i); i++) sum += v(x / power(i)) * power(i);
      // Smaller scales: x*64^i, until the terms no longer affect the sum at CALC_PREC digits.
      let i = 0;
      do {
        if (++i > CALC_PREC + 2) break;
        sum += v(x * power(i)) / power(i);
      } while (sum < power(CALC_PREC - i + 2));
    }
    // Dividing by 64^3 gives values consistent with the Apple II version.
    return sum / power(3);
  };

  return {
    waveFactor,
    dataPoints,
    value(daysToZero: number): number {
      if (!(daysToZero >= 0)) throw new RangeError("Days to zero date must not be negative.");
      return f(daysToZero);
    },
  };
}
