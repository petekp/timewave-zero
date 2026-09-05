import type { ScreenSetStore } from "./store";

const PREFIX = "twz:screens:";

/** Screen sets live in localStorage under their DOS file name. */
export class LocalStorageStore implements ScreenSetStore {
  load(name: string): string | null {
    try {
      return localStorage.getItem(PREFIX + name.toUpperCase());
    } catch {
      return null;
    }
  }
  save(name: string, data: string): void {
    try {
      localStorage.setItem(PREFIX + name.toUpperCase(), data);
    } catch {
      // Storage unavailable (private mode): the set lives only for this visit.
    }
  }
}
