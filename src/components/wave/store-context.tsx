"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { WaveState, WaveStore } from "@/lib/wave/store";

export const WaveStoreContext = createContext<WaveStore | null>(null);

export function useWaveStore(): WaveStore {
  const store = useContext(WaveStoreContext);
  if (!store) throw new Error("useWaveStore needs a WaveStoreContext provider.");
  return store;
}

export function useWave<T>(selector: (s: WaveState) => T): T {
  return useStore(useWaveStore(), selector);
}
