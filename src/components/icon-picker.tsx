import { useEffect, useMemo, useState } from 'react';
import { loadPack } from '@/lib/icons/icon-loader';
import type { IconComponent, PackName } from '@/lib/icons';
import { log } from '@/log';

export type IconPickerProps = {
  readonly pack: PackName;
  readonly value?: string;
  readonly onChange: (key: string) => void;
  readonly searchPlaceholder?: string;
  readonly className?: string;
};

/**
 * Grid icon picker scoped to a single pack. Loads the pack bundle on mount
 * (instant if already cached) and renders all icons from the in-memory map.
 */
export function IconPicker({
  pack,
  value,
  onChange,
  searchPlaceholder = 'Search icons…',
  className,
}: IconPickerProps) {
  const [icons, setIcons] = useState<Readonly<Record<string, IconComponent>> | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadPack(pack).then((m) => {
      if (!cancelled) setIcons(m);
    }).catch((err: unknown) => {
      log.icons.warn('failed to load pack %s: %o', pack, err);
    });
    return () => { cancelled = true; };
  }, [pack]);

  const allKeys = useMemo(() => (icons ? Object.keys(icons).sort() : []), [icons]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allKeys;
    return allKeys.filter((key) => key.toLowerCase().includes(q));
  }, [allKeys, search]);

  if (!icons) {
    return <div data-slot="icon-picker-loading" className={className}>Loading icons…</div>;
  }

  return (
    <div data-slot="icon-picker" className={className}>
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); }}
        placeholder={searchPlaceholder}
        data-slot="icon-picker-search"
      />
      <div data-slot="icon-picker-grid">
        {filtered.map((key) => {
          const IconComp = icons[key];
          return (
            <button
              key={key}
              type="button"
              data-slot="icon-picker-item"
              data-selected={value === key ? '' : undefined}
              onClick={() => { onChange(key); }}
              aria-label={key}
            >
              <IconComp />
            </button>
          );
        })}
      </div>
    </div>
  );
}
