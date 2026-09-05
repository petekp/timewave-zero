/** Where screen sets are kept: the browser's localStorage in the app, memory in tests. */
export interface ScreenSetStore {
  load(name: string): string | null;
  save(name: string, data: string): void;
}

export class MemoryStore implements ScreenSetStore {
  private files = new Map<string, string>();
  load(name: string): string | null {
    return this.files.get(name) ?? null;
  }
  save(name: string, data: string): void {
    this.files.set(name, data);
  }
}
