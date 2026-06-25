/**
 * Tag — categorises transactions. Stored globally per tenant. Hierarchical via
 * the optional `parent` reference to another Tag id; flat at the schema level,
 * tree at the app layer.
 *
 * `icon` is a string key into the shared icon registry (see lib/icons). It is
 * intentionally not typed against `IconKey` so tags survive icon manifest
 * changes; the UI falls back gracefully if the icon goes missing.
 */
export type Tag = {
  readonly name: string
  readonly icon: string
  readonly description?: string
  readonly parent?: string
}
