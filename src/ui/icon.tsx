import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { loadIcon } from '@/lib/icons/icon-loader';
import type { IconComponent } from '@/lib/icons';
import { log } from '@/log';

export type IconProps = SVGProps<SVGSVGElement> & {
  readonly name: string;
  readonly fallback?: ComponentType<SVGProps<SVGSVGElement>>;
};

/** Returns the cached component if `loadIcon` resolved synchronously. */
function syncOrUndefined(result: IconComponent | Promise<IconComponent>): IconComponent | undefined {
  return result instanceof Promise ? undefined : result;
}

/**
 * Renders an icon by name. Cached icons render synchronously on first paint
 * (no flash); uncached icons trigger a lazy import and render once it
 * resolves. Cache + dedup live in the loader.
 */
export function Icon({ name, fallback, ...svgProps }: IconProps) {
  // Track the resolved component alongside the name it belongs to so we can
  // reset state when `name` changes (set-state-during-render pattern, not in
  // an effect).
  const [state, setState] = useState<{ name: string; Component: IconComponent | undefined }>(() => ({
    name,
    Component: syncOrUndefined(loadIcon(name)),
  }));

  if (state.name !== name) {
    setState({ name, Component: syncOrUndefined(loadIcon(name)) });
  }

  useEffect(() => {
    const result = loadIcon(name);
    if (!(result instanceof Promise)) return;
    let cancelled = false;
    result.then((c) => {
      if (cancelled) return;
      setState((prev) => prev.name === name ? { name, Component: c } : prev);
    }).catch((err: unknown) => {
      log.icons.warn('failed to load icon %s: %o', name, err);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (!state.Component) {
    if (fallback) {
      const Fallback = fallback;
      return <Fallback {...svgProps} />;
    }
    return null;
  }
  const Component = state.Component;
  return <Component {...svgProps} />;
}
