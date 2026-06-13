/**
 * Global "magic word" registry — Chrome's `thisisunsafe` trick.
 *
 * A single `keydown` listener accumulates typed characters into a rolling
 * buffer. Any registered word whose text appears at the end of the buffer
 * fires its callback. The listener is attached lazily on the first
 * registration and detached when the last word is unregistered.
 *
 * Consumers register/unregister their own words (typically from a
 * `useEffect`), so this stays decoupled from React.
 */

type Entry = { readonly word: string; readonly onMatch: () => void }

const entries = new Set<Entry>()
let buffer = ""
let listening = false

function maxWordLength(): number {
  let max = 0
  for (const e of entries) max = Math.max(max, e.word.length)
  return max
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

function handleKeydown(e: KeyboardEvent): void {
  // Only single printable characters; ignore shortcuts and editable fields.
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key.length !== 1) return
  if (isEditableTarget(e.target)) return

  buffer = (buffer + e.key).toUpperCase().slice(-maxWordLength())

  for (const entry of entries) {
    if (buffer.endsWith(entry.word.toUpperCase())) {
      buffer = ""
      entry.onMatch()
      break
    }
  }
}

function ensureListening(): void {
  if (listening || typeof window === "undefined") return
  window.addEventListener("keydown", handleKeydown)
  listening = true
}

function stopListeningIfIdle(): void {
  if (entries.size > 0 || !listening || typeof window === "undefined") return
  window.removeEventListener("keydown", handleKeydown)
  listening = false
  buffer = ""
}

/**
 * Register a magic word. Returns an unregister function — call it on
 * cleanup (e.g. the `useEffect` return).
 */
export function registerMagicWord(word: string, onMatch: () => void): () => void {
  const entry: Entry = { word, onMatch }
  entries.add(entry)
  ensureListening()
  return () => {
    entries.delete(entry)
    stopListeningIfIdle()
  }
}
