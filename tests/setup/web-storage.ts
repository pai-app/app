import { vi } from "vitest"

/**
 * Web Storage polyfill for the node test environment. A few service modules
 * transitively import `@/lib/fyredb-config`, which reads `localStorage` (device
 * id) at module-evaluation time and `sessionStorage` (one-shot OAuth creds) in
 * `ConnectionsService`'s constructor. This in-memory store makes those reads
 * harmless so the pure-TS services stay unit-testable without a DOM env.
 */
class MemoryStorage {
  private readonly store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

vi.stubGlobal("localStorage", new MemoryStorage())
vi.stubGlobal("sessionStorage", new MemoryStorage())
