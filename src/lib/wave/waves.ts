import { dataPointsFor, type NumberSetName } from "../timewave/datasets";
import { createWave, type Wave } from "../timewave/wave";

const cache = new Map<NumberSetName, Wave>();

/** One wave per number set, built on first use. */
export function waveFor(name: NumberSetName): Wave {
  let w = cache.get(name);
  if (!w) {
    w = createWave({ dataPoints: dataPointsFor(name) });
    cache.set(name, w);
  }
  return w;
}
