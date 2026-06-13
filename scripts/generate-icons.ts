/**
 * Icon generator. Reads `icons.config.ts` and produces:
 *
 *   src/lib/icons/generated/
 *   ├── <pack>/
 *   │   └── <key>.tsx       — per-icon module, self-contained React component
 *   ├── <pack>.bundle.tsx   — pack bundle, all icons inlined, NO external imports
 *   ├── config.ts           — runtime config + ICON_TO_PACK reverse lookup
 *   └── index.ts            — public re-exports + types
 *
 * Every icon kind (lucide / simple-icons / svg / tsx) is converted to a raw
 * <svg> JSX component with all attributes inlined. Generated code has zero
 * runtime imports from icon source packages — the bundle is one chunk that
 * contains everything, no cascading loads.
 *
 * Run via: npm run gen:icons
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as simpleIcons from 'simple-icons';
import { XMLParser } from 'fast-xml-parser';
import { manifest } from '../icons.config';
import type { IconEntry, IconNode, Manifest } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const ASSETS_DIR = join(PROJECT_ROOT, 'src', 'assets', 'icons');
const OUT_DIR = join(PROJECT_ROOT, 'src', 'lib', 'icons', 'generated');

const LUCIDE_SVG_ATTRS = `width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"`;

// ─── File helpers ────────────────────────────────────────

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function pascalCase(key: string): string {
  return key.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

// ─── HTML/SVG → JSX attribute conversion ─────────────────

function toJsxAttr(name: string): string {
  if (name === 'class') return 'className';
  if (name === 'for') return 'htmlFor';
  return name.includes('-') ? name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) : name;
}

function styleStringToObject(style: string): string {
  const entries = style.split(';').map(s => s.trim()).filter(Boolean).flatMap((decl) => {
    const idx = decl.indexOf(':');
    if (idx === -1) return [];
    const prop = decl.slice(0, idx).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    return [`${JSON.stringify(prop)}: ${JSON.stringify(decl.slice(idx + 1).trim())}`];
  });
  return `{{${entries.join(', ')}}}`;
}

function renderAttrs(attrs: Record<string, string>, skip: readonly string[] = []): string {
  return Object.entries(attrs)
    .filter(([k]) => !skip.includes(k) && !k.startsWith('xmlns'))
    .map(([k, v]) => {
      const name = toJsxAttr(k);
      return name === 'style' ? `style=${styleStringToObject(v)}` : `${name}=${JSON.stringify(v)}`;
    })
    .join(' ');
}

function renderNode([tag, attrs]: IconNode): string {
  const props = renderAttrs(attrs);
  return `<${tag}${props ? ' ' + props : ''} />`;
}

// ─── Source loaders ──────────────────────────────────────

async function loadLucideNode(iconName: string): Promise<readonly IconNode[]> {
  const kebab = iconName
    .replace(/Icon$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
  const mod = await import(`lucide-react/dist/esm/icons/${kebab}.mjs`) as { __iconNode: readonly IconNode[] };
  if (!mod.__iconNode) throw new Error(`lucide-react: ${iconName} (${kebab}.mjs) has no __iconNode export`);
  return mod.__iconNode;
}

function loadTsxNode(path: string): readonly IconNode[] {
  const source = readFileSync(join(ASSETS_DIR, `${path}.tsx`), 'utf8');
  const match = source.match(/createLucideIcon\s*\(\s*"[^"]*"\s*,\s*(\[[\s\S]*?\])\s*\)/);
  if (!match) throw new Error(`tsx icon ${path}: no createLucideIcon array`);
  return JSON.parse(match[1]) as readonly IconNode[];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  preserveOrder: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderXmlNodes(nodes: any[]): string {
  return nodes.map((node: Record<string, unknown>) => {
    const tag = Object.keys(node).find((k: string) => k !== ':@' && k !== '#text');
    if (!tag) return '';
    const attrs = (node[':@'] as Record<string, string> | undefined) ?? {};
    const props = renderAttrs(attrs);
    const children = node[tag] as unknown[];
    return Array.isArray(children) && children.length > 0
      ? `<${tag}${props ? ' ' + props : ''}>${renderXmlNodes(children)}</${tag}>`
      : `<${tag}${props ? ' ' + props : ''} />`;
  }).join('');
}

function loadSvg(path: string): { attrs: Record<string, string>; bodyJsx: string } {
  const xml = readFileSync(join(ASSETS_DIR, path), 'utf8');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = xmlParser.parse(xml) as any[];
  const svgEntry = parsed.find((e: Record<string, unknown>) => 'svg' in e);
  if (!svgEntry) throw new Error(`SVG ${path}: no <svg> root`);
  return {
    attrs: (svgEntry[':@'] as Record<string, string> | undefined) ?? {},
    bodyJsx: renderXmlNodes(svgEntry.svg as unknown[]),
  };
}

// ─── JSX component builder ───────────────────────────────

/** Wrap attributes + body in a default-exported React component. */
function svgComponent(componentName: string, svgAttrs: string, body: string): string {
  return [
    `export default function ${componentName}(props: SVGProps<SVGSVGElement>) {`,
    `  return (`,
    `    <svg ${svgAttrs} {...props}>`,
    `      ${body}`,
    `    </svg>`,
    `  );`,
    `}`,
  ].join('\n');
}

/** Convert any icon entry to a self-contained React component string. */
async function buildIconComponent(icon: IconEntry): Promise<string> {
  const componentName = pascalCase(icon.key) + 'Icon';

  switch (icon.kind) {
    case 'lucide': {
      const nodes = await loadLucideNode(icon.name);
      const attrs = `${LUCIDE_SVG_ATTRS} data-icon=${JSON.stringify(icon.key)}`;
      return svgComponent(componentName, attrs, nodes.map(renderNode).join('\n      '));
    }
    case 'tsx': {
      const nodes = loadTsxNode(icon.path);
      const attrs = `${LUCIDE_SVG_ATTRS} data-icon=${JSON.stringify(icon.key)}`;
      return svgComponent(componentName, attrs, nodes.map(renderNode).join('\n      '));
    }
    case 'simple-icons': {
      const si = (simpleIcons as unknown as Record<string, { title: string; path: string }>)[icon.name];
      if (!si) throw new Error(`simple-icons: ${icon.name} not found`);
      const attrs = `viewBox="0 0 24 24" width={24} height={24} fill="currentColor" role="img" aria-label=${JSON.stringify(si.title)}`;
      return svgComponent(componentName, attrs, `<path d=${JSON.stringify(si.path)} />`);
    }
    case 'svg': {
      const { attrs: rawAttrs, bodyJsx } = loadSvg(icon.path);
      const rendered = renderAttrs(rawAttrs, ['width', 'height']);
      return svgComponent(componentName, `width={24} height={24} ${rendered}`, bodyJsx);
    }
  }
}

// ─── File generators ─────────────────────────────────────

function perIconFile(componentBody: string): string {
  return `import type { SVGProps } from 'react';\n\n${componentBody}\n`;
}

function bundleFile(packName: string, components: readonly { icon: IconEntry; component: string }[]): string {
  const lines = [
    `// Bundle module for the "${packName}" pack.`,
    `// Self-contained — every icon is inlined as raw JSX. No external imports.`,
    ``,
    `import type { ComponentType, SVGProps } from 'react';`,
    ``,
    `export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;`,
    ``,
  ];

  for (const { component } of components) {
    lines.push(component.replace(/^export default function/, 'function'), '');
  }

  lines.push(`export const icons: Readonly<Record<string, IconComponent>> = {`);
  for (const { icon } of components) {
    lines.push(`  ${JSON.stringify(icon.key)}: ${pascalCase(icon.key)}Icon,`);
  }
  lines.push(`};`, ``);
  return lines.join('\n');
}

function configFile(m: Manifest): string {
  const lines = [
    `// Generated runtime config — maps pack name → { bundle, icons }.`,
    `// Vite statically analyses the import() calls below to produce per-icon`,
    `// chunks and per-pack bundle chunks.`,
    ``,
    `import type { ComponentType, SVGProps } from 'react';`,
    ``,
    `export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;`,
    `export type IconLoader = () => Promise<{ default: IconComponent }>;`,
    `export type BundleLoader = () => Promise<{ icons: Readonly<Record<string, IconComponent>> }>;`,
    ``,
    `export type PackConfig = {`,
    `  readonly bundle: BundleLoader;`,
    `  readonly icons: Readonly<Record<string, IconLoader>>;`,
    `};`,
    ``,
    `export const ICONS_CONFIG = {`,
  ];

  for (const [packName, pack] of Object.entries(m.packs)) {
    lines.push(`  ${JSON.stringify(packName)}: {`);
    lines.push(`    bundle: () => import('./${packName}.bundle'),`);
    lines.push(`    icons: {`);
    for (const icon of pack.icons) {
      lines.push(`      ${JSON.stringify(icon.key)}: () => import('./${packName}/${icon.key}'),`);
    }
    lines.push(`    },`, `  },`);
  }
  lines.push(`} as const satisfies Record<string, PackConfig>;`, ``);

  lines.push(`export type PackName = keyof typeof ICONS_CONFIG;`, ``);
  for (const packName of Object.keys(m.packs)) {
    lines.push(`export type ${pascalCase(packName)}Key = keyof typeof ICONS_CONFIG[${JSON.stringify(packName)}]['icons'];`);
  }
  lines.push(`export type IconKey = ${Object.keys(m.packs).map(p => `${pascalCase(p)}Key`).join(' | ')};`, ``);

  // Reverse lookup: icon key → pack name. First registration wins on collisions.
  // Indexing with an arbitrary string may yield undefined (unknown name).
  lines.push(`export const ICON_TO_PACK: { readonly [key: string]: PackName | undefined } = {`);
  const seen = new Set<string>();
  for (const [packName, pack] of Object.entries(m.packs)) {
    for (const icon of pack.icons) {
      if (seen.has(icon.key)) continue;
      seen.add(icon.key);
      lines.push(`  ${JSON.stringify(icon.key)}: ${JSON.stringify(packName)},`);
    }
  }
  lines.push(`};`, ``);
  return lines.join('\n');
}

const indexFile = `export { ICONS_CONFIG, ICON_TO_PACK } from './config';
export type { IconComponent, IconLoader, BundleLoader, PackConfig, PackName, IconKey } from './config';
`;

// ─── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let total = 0;
  for (const [packName, pack] of Object.entries(manifest.packs)) {
    const components = await Promise.all(
      pack.icons.map(async (icon) => ({ icon, component: await buildIconComponent(icon) })),
    );

    for (const { icon, component } of components) {
      writeFile(join(OUT_DIR, packName, `${icon.key}.tsx`), perIconFile(component));
      total++;
    }
    writeFile(join(OUT_DIR, `${packName}.bundle.tsx`), bundleFile(packName, components));
  }

  writeFile(join(OUT_DIR, 'config.ts'), configFile(manifest));
  writeFile(join(OUT_DIR, 'index.ts'), indexFile);

  // eslint-disable-next-line no-console
  console.log(`✓ generated ${total} icons across ${Object.keys(manifest.packs).length} packs`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
