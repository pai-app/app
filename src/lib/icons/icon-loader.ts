import { ICONS_CONFIG, ICON_TO_PACK, type IconComponent, type PackName } from './generated';

const iconCache = new Map<string, IconComponent>();
const inflightIcons = new Map<string, Promise<IconComponent>>();
const packCache = new Map<PackName, Readonly<Record<string, IconComponent>>>();
const inflightPacks = new Map<PackName, Promise<Readonly<Record<string, IconComponent>>>>();

/**
 * Load a single icon by name. Returns the component synchronously when
 * already cached, otherwise a `Promise` that resolves once the chunk loads.
 *
 * The sync-or-promise return lets callers (e.g. `<Icon>`) skip the
 * useEffect → setState round-trip on the very first render whenever the
 * icon's pack has been loaded already.
 */
export function loadIcon(name: string): IconComponent | Promise<IconComponent> {
  const cached = iconCache.get(name);
  if (cached) return cached;

  const inflight = inflightIcons.get(name);
  if (inflight) return inflight;

  const pack = ICON_TO_PACK[name];
  if (!pack) return Promise.reject(new Error(`Icon "${name}" not found in any pack`));

  const loader = (ICONS_CONFIG[pack].icons as { [key: string]: (() => Promise<{ default: IconComponent }>) | undefined })[name];
  if (!loader) return Promise.reject(new Error(`Icon "${name}" not found in pack "${pack}"`));

  const promise = loader().then((m) => {
    iconCache.set(name, m.default);
    inflightIcons.delete(name);
    return m.default;
  });
  inflightIcons.set(name, promise);
  return promise;
}

/** Load a full pack. Pre-fills the icon cache so subsequent loadIcon calls are instant. */
export async function loadPack(pack: PackName): Promise<Readonly<Record<string, IconComponent>>> {
  const cached = packCache.get(pack);
  if (cached) return cached;
  const inflight = inflightPacks.get(pack);
  if (inflight) return inflight;

  const promise = ICONS_CONFIG[pack].bundle().then((m) => {
    for (const [name, component] of Object.entries(m.icons)) {
      iconCache.set(name, component);
    }
    packCache.set(pack, m.icons);
    inflightPacks.delete(pack);
    return m.icons;
  });
  inflightPacks.set(pack, promise);
  return promise;
}
