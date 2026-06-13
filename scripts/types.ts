/**
 * Types for the icon manifest. Used by:
 *   - icons.config.ts (manifest source)
 *   - scripts/generate-icons.ts (generator)
 */

export type LucideIcon = { kind: 'lucide'; key: string; name: string };
export type SimpleIcon = { kind: 'simple-icons'; key: string; name: string };
export type SvgIcon = { kind: 'svg'; key: string; path: string };
export type TsxIcon = { kind: 'tsx'; key: string; path: string; name: string };
export type IconEntry = LucideIcon | SimpleIcon | SvgIcon | TsxIcon;

export type ManifestPack = { icons: IconEntry[] };
export type Manifest = { packs: Record<string, ManifestPack> };

/** Lucide-style SVG node: [tag, attributes]. Used by lucide and tsx icons. */
export type IconNode = readonly [string, Record<string, string>];
