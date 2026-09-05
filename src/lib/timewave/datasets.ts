/**
 * The four number sets shipped with the later Timewave Zero software
 * (Meyer's TW.C, 1998): three derived at load time from hexagram sequences,
 * Sheliak's stored as data.
 */
import { derive } from "./derive";
import { HUANG_TI_ORDER, KING_WEN_ORDER } from "./hexagrams";
import { SHELIAK_DATA_POINTS } from "./sheliak";

export type NumberSetName = "DATA.TWZ" | "Kelley" | "Watkins" | "Sheliak" | "Huang Ti";

export const NUMBER_SET_NAMES: readonly NumberSetName[] = ["DATA.TWZ", "Kelley", "Watkins", "Sheliak", "Huang Ti"];

/** The DATA.TWZ shipped with version 4.22 differs from the derived Kelley set at one index. */
const SHIPPED_PATCHES: Record<number, number> = { 119: 22 };

export interface NumberSetInfo {
  name: NumberSetName;
  /** One-line description shown in the UI. */
  description: string;
}

export const NUMBER_SET_INFO: Record<NumberSetName, NumberSetInfo> = {
  "DATA.TWZ": { name: "DATA.TWZ", description: "The data file shipped with Timewave Zero 4.22 (Kelley's set with one transcription difference)" },
  Kelley: { name: "Kelley", description: "King Wen sequence with the half twist (the original 1970s set)" },
  Watkins: { name: "Watkins", description: "King Wen sequence without the half twist (Watkins, 1996)" },
  Sheliak: { name: "Sheliak", description: "Sheliak's vector-analysis revision (1998)" },
  "Huang Ti": { name: "Huang Ti", description: "Huang Ti sequence without the half twist" },
};

const cache = new Map<NumberSetName, readonly number[]>();

export function dataPointsFor(name: NumberSetName): readonly number[] {
  let v = cache.get(name);
  if (v) return v;
  switch (name) {
    case "DATA.TWZ": {
      const pts = [...derive(KING_WEN_ORDER, true).dataPoints];
      for (const [i, value] of Object.entries(SHIPPED_PATCHES)) pts[Number(i)] = value;
      v = pts;
      break;
    }
    case "Kelley":
      v = derive(KING_WEN_ORDER, true).dataPoints;
      break;
    case "Watkins":
      v = derive(KING_WEN_ORDER, false).dataPoints;
      break;
    case "Sheliak":
      v = SHELIAK_DATA_POINTS;
      break;
    case "Huang Ti":
      v = derive(HUANG_TI_ORDER, false).dataPoints;
      break;
  }
  cache.set(name, v);
  return v;
}
