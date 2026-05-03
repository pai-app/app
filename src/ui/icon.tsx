import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { loadIcon } from '@/lib/icons/icon-loader';
import type { IconComponent } from '@/lib/icons';
import { log } from '@/log';

export type IconProps = SVGProps<SVGSVGElement> & {
  readonly name: string;
  readonly fallback?: ComponentType<SVGProps<SVGSVGElement>>;
};

/**
 * Renders an icon by name. Lazy-loads on first use and caches it.
 * If the pack bundle is already loaded, renders instantly.
 */
export function Icon({ name, fallback, ...svgProps }: IconProps) {
  const [Component, setComponent] = useState<IconComponent | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadIcon(name).then((c) => {
      if (!cancelled) setComponent(() => c);
    }).catch((err: unknown) => {
      log.icons.warn('failed to load icon %s: %o', name, err);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (!Component) {
    if (fallback) {
      const Fallback = fallback;
      return <Fallback {...svgProps} />;
    }
    return null;
  }
  return <Component {...svgProps} />;
}
