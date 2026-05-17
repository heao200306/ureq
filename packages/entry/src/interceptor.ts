export class InterceptorManager {
  private interceptors: Map<number, { fulfilled?: Function; rejected?: Function }> = new Map();
  private nextId: number = 0;

  use(fulfilled?: Function, rejected?: Function): { id: number } {
    const id = this.nextId++;
    this.interceptors.set(id, { fulfilled, rejected });
    return { id };
  }

  eject(id: number): void {
    this.interceptors.delete(id);
  }

  clear(): void {
    this.interceptors.clear();
  }

  forEach(fn: (hook: { fulfilled?: Function; rejected?: Function }) => void): void {
    for (const hook of this.interceptors.values()) {
      fn(hook);
    }
  }

  get size(): number {
    return this.interceptors.size;
  }
}