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
  tenants: createLogger('tenants'),
  sync: createLogger('sync'),
}
