import { useState, type ReactNode } from "react"
import { Button } from "@/ui/button"
import { Currency } from "@/ui/currency"
import { Icon } from "@/ui/icon"
import { Money } from "@/ui/money"
import { OverflowBar } from "@/ui/overflow-bar"
import { TagIcon } from "@/ui/tag-icon"
import { Text } from "@/ui/text"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { Logo } from "@/components/logo"
import { SyncStatus } from "@/components/sync-status"
import { Navbar } from "@/components/navbar/navbar"
import { TagPicker } from "@/components/tag-picker"
import type { TagView } from "@/services/tags-service"
import { notify } from "@/services/notifications"

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="heading">{title}</Text>
      <div className="flex flex-wrap items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        {children}
      </div>
    </section>
  )
}

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "GEL", "PHP", "RUB", "SAR", "CHF", "TRY"] as const

/**
 * Design-system showcase, rendered inside the dev hub's Components section.
 * Renders Pai's app-specific components and formatters. Built-in shadcn
 * primitives (Button, Card, etc.) are intentionally omitted — they're
 * documented upstream.
 */
export function ComponentsSection() {
  return (
    <div className="flex flex-col gap-10">

      <Section title="Logo">
        <Logo className="h-8 w-auto" />
        <Logo className="h-12 w-auto" />
      </Section>

      <Section title="Navbar">
        <div className="flex w-full flex-col gap-4">
          <div>
            <Text variant="caption">Default layout</Text>
            <div className="mt-2"><Navbar /></div>
          </div>
          <div>
            <Text variant="caption">Compact (mobile) layout</Text>
            <div className="mt-2"><Navbar isMobile /></div>
          </div>
        </div>
      </Section>

      <Section title="Theme switcher">
        <ThemeSwitcher />
      </Section>

      <Section title="Sync status">
        <SyncStatus />
      </Section>

      <Section title="Notifications (toast — non-persistent)">
        <NotificationDemo />
      </Section>

      <Section title="Full-page spinner">
        <div className="w-full">
          <Text variant="caption">Inline preview (height-bounded)</Text>
          <div className="mt-2 flex h-40 items-center justify-center rounded-md border border-border/50">
            <FullPageSpinner message="Loading…" />
          </div>
        </div>
      </Section>

      <Section title="Tag picker">
        <TagPickerDemo />
      </Section>

      <Section title="Icon (lazy-loaded by name)">
        <Icon name="wallet" className="size-5" />
        <Icon name="coffee" className="size-5" />
        <Icon name="plane" className="size-5" />
        <Icon name="indian-rupee" className="size-5" />
        <Icon name="dollar-sign" className="size-5" />
        <Icon name="netflix" className="size-5" />
        <Icon name="spotify" className="size-5" />
      </Section>

      <Section title="Text variants">
        <Text variant="title">Title</Text>
        <Text variant="heading">Heading</Text>
        <Text variant="default">Default</Text>
        <Text variant="muted">Muted</Text>
        <Text variant="caption">Caption</Text>
        <Text variant="label">label</Text>
        <Text variant="destructive">Destructive</Text>
      </Section>

      <Section title="Overflow bar">
        <div className="w-full max-w-md">
          <OverflowBar
            className="glass h-11 min-w-0 shrink rounded-full px-1.5"
            items={Array.from({ length: 12 }, (_, i) => ({
              key: String(i),
              element: <span className="relative z-10">Item {i + 1}</span>,
              active: i === 0,
            }))}
          />
        </div>
      </Section>

      <Section title="Currency — variants">
        {CURRENCIES.map((code) => (
          <div key={code} className="flex w-24 flex-col items-center gap-1 rounded-md bg-muted/30 p-2">
            <Currency code={code} variant="icon" className="size-5" />
            <Currency code={code} variant="text" className="text-base" />
            <Currency code={code} variant="code" className="text-xs text-muted-foreground" />
          </div>
        ))}
      </Section>

      <Section title="Money — default (locale-aware)">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {CURRENCIES.map((code) => (
            <div key={code} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
              <Text variant="caption">{code}</Text>
              <Money amount={123456789} currency={code} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2">
            <Text variant="caption">negative INR</Text>
            <Money amount={-123450} currency="INR" />
          </div>
        </div>
      </Section>

      <Section title="Money — icon variant">
        <Money amount={123450} currency="INR" variant="icon" />
        <Money amount={-123450} currency="INR" variant="icon" />
        <Money amount={4200} currency="USD" variant="icon" />
        <Money amount={9999} currency="JPY" variant="icon" />
      </Section>

    </div>
  )
}

/**
 * Fires toast-only notifications (`channels: ["toast"]`, `fyredb: null`) — no
 * inbox row is written, demonstrating non-persistent delivery.
 */
function NotificationDemo() {
  const fire = (display: "info" | "success" | "warning" | "error") => {
    notify(null, {
      kind: "showcase-demo",
      display,
      title: `${display[0].toUpperCase()}${display.slice(1)} toast`,
      body: "Transient notification — not stored in the inbox.",
    }, { channels: ["toast"] })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => { fire("info") }}>Info</Button>
      <Button variant="outline" onClick={() => { fire("success") }}>Success</Button>
      <Button variant="outline" onClick={() => { fire("warning") }}>Warning</Button>
      <Button variant="outline" onClick={() => { fire("error") }}>Error</Button>
    </div>
  )
}

function TagPickerDemo() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<TagView | null>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <TagPicker
        open={open}
        onOpenChange={setOpen}
        selectedTagId={selected?.id ?? null}
        onSelect={setSelected}
      >
        <Button variant="outline">
          {selected ? (
            <>
              <TagIcon tag={selected} className="size-4" />
              {selected.name}
            </>
          ) : (
            "Pick a tag…"
          )}
        </Button>
      </TagPicker>
      <Text variant="caption">
        {selected ? `Selected id: ${selected.id}` : "No tag selected"}
      </Text>
    </div>
  )
}
