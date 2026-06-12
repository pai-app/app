import debug from 'debug'

const root = debug('fin')

function createLogger(module: string) {
  const base = root.extend(module)
  return Object.assign(base, {
    warn: base.extend('warn'),
    error: base.extend('error'),
  })
}

export const log = {
  app: createLogger('app'),
  router: createLogger('router'),
  home: createLogger('home'),
  import: createLogger('import'),
  tenants: createLogger('tenants'),
  sync: createLogger('sync'),
  icons: createLogger('icons'),
}

/**
 * Known logging namespaces, grouped by package, for the dev logging tool.
 * `pai` entries are derived from `log` so new loggers appear automatically;
 * `core` (@fyre-db/core) namespaces are listed explicitly since that
 * package's `log` object is not exported publicly.
 */
export const LOG_NAMESPACES: ReadonlyArray<{
  readonly group: string
  readonly namespaces: ReadonlyArray<string>
}> = [
  { group: 'fin', namespaces: Object.values(log).map((l) => l.namespace) },
  { group: 'core', namespaces: ['core:fyredb', 'core:repo', 'core:store', 'core:sync', 'core:tenant'] },
]

/** Whether `debug` would currently emit for the given namespace. */
export function isNamespaceEnabled(namespace: string): boolean {
  return debug.enabled(namespace)
}

/**
 * Enable exactly the given base namespaces (and their `:warn`/`:error`
 * children) at runtime. Passing an empty list disables all logging. In the
 * browser this persists to `localStorage.debug`.
 */
export function applyLogNamespaces(namespaces: ReadonlyArray<string>): void {
  if (namespaces.length === 0) {
    debug.disable()
    return
  }
  debug.enable(namespaces.map((ns) => `${ns}*`).join(','))
}

/** Apply a raw `debug` pattern string verbatim (escape hatch for the UI). */
export function applyLogPattern(pattern: string): void {
  const trimmed = pattern.trim()
  if (trimmed === '') {
    debug.disable()
    return
  }
  debug.enable(trimmed)
}

/** The active `debug` pattern (browser-persisted), or empty when none. */
export function getLogPattern(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem('debug') ?? ''
}
