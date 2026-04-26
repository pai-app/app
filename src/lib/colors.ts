type PaletteColor = {
  readonly bg: string
  readonly text: string
  readonly darkText: string
}

const PALETTE: readonly PaletteColor[] = [
  { bg: "bg-blue-500/15", text: "text-blue-700", darkText: "dark:text-blue-400" },
  { bg: "bg-emerald-500/15", text: "text-emerald-700", darkText: "dark:text-emerald-400" },
  { bg: "bg-amber-500/15", text: "text-amber-700", darkText: "dark:text-amber-400" },
  { bg: "bg-violet-500/15", text: "text-violet-700", darkText: "dark:text-violet-400" },
  { bg: "bg-rose-500/15", text: "text-rose-700", darkText: "dark:text-rose-400" },
  { bg: "bg-cyan-500/15", text: "text-cyan-700", darkText: "dark:text-cyan-400" },
]

function hash(key: string): number {
  let h = 0
  for (const ch of key) h = ((h << 5) - h + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

function getColor(key: string): PaletteColor {
  return PALETTE[hash(key) % PALETTE.length]
}

export { type PaletteColor, PALETTE, getColor }
