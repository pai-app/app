import type { StorageSlot } from "@fyre-db/plugins"

/**
 * Encode/decode wrapper applied to a slot's stored value. The app owns any
 * obfuscation or encryption here — `@fyre-db/plugins` only ever sees plain
 * strings through `StorageSlot`.
 */
export type StorageTransform = {
  encode(value: string): string
  decode(value: string): string
}

function webSlot(
  area: () => Storage | undefined,
  key: string,
  transform?: StorageTransform,
): StorageSlot {
  return {
    get: () => {
      try {
        const raw = area()?.getItem(key) ?? null
        return raw === null ? null : transform ? transform.decode(raw) : raw
      } catch {
        return null
      }
    },
    set: (value: string) => {
      try {
        area()?.setItem(key, transform ? transform.encode(value) : value)
      } catch {
        /* best-effort */
      }
    },
    clear: () => {
      try {
        area()?.removeItem(key)
      } catch {
        /* best-effort */
      }
    },
  }
}

/** A `StorageSlot` backed by `sessionStorage`. */
export function sessionSlot(key: string, transform?: StorageTransform): StorageSlot {
  return webSlot(() => globalThis.sessionStorage, key, transform)
}

/** A `StorageSlot` backed by `localStorage`. */
export function localSlot(key: string, transform?: StorageTransform): StorageSlot {
  return webSlot(() => globalThis.localStorage, key, transform)
}

function xor(text: string, secret: string): string {
  const out: string[] = []
  for (let i = 0; i < text.length; i++) {
    out.push(String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length)))
  }
  return out.join("")
}

/**
 * Light XOR obfuscation (NOT encryption) keyed by a secret. Only deters a
 * casual glance at the raw value — the secret is recoverable on the client.
 */
export function xorTransform(secret: string): StorageTransform {
  return {
    encode: (value) => btoa(xor(value, secret)),
    decode: (encoded) => xor(atob(encoded), secret),
  }
}

/** Read (or lazily create + persist) a stable device id under `key`. */
export function getOrCreateDeviceId(key: string): string {
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}
