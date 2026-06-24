import { Icon } from "@/ui/icon"
import { Money } from "@/ui/money"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { getBankDisplay, getOfferingDisplay, KIND_DISPLAY } from "@/services/catalog/bank-display"
import { useObservable } from "@/lib/use-observable"
import { useServices } from "@/providers/services-provider"
import type { AccountDetails, AccountView } from "@/services/accounts-service"
import { buildAccountCardModel } from "./account-card-model"

/**
 * Home dashboard. Until the overview widgets land, this surfaces every money
 * account as a card showing all stored metadata — useful for verifying what
 * the importer wrote.
 */
export function HomePage() {
  const accounts = useObservable(useServices().accounts.accounts$)

  if (accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Icon name="home" className="size-10 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">No accounts yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a statement or sync an email account to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Accounts</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}

/** Metadata keys promoted into the card header (handled specially, not listed). */
const PROMOTED_KEYS = ["accountNumber", "accountHolderName"] as const

/** Human-readable labels for known metadata keys; falls back to de-camel-casing. */
const METADATA_LABEL: Readonly<Record<string, string>> = {
  accountNumber: "Account number",
  accountHolderName: "Account holder",
  ifscCode: "IFSC",
  micrCode: "MICR",
  customerId: "Customer ID",
  swiftCode: "SWIFT",
}

/** "as of" / due-date format — "DD MMM YYYY", UTC to align with the statement's close date. */
const AS_OF_FMT = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function humanizeKey(key: string): string {
  return (
    METADATA_LABEL[key] ??
    key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())
  )
}

/** Mask all but the last 4 chars of an account/card number. */
function maskNumber(value: string): string {
  const visible = value.slice(-4)
  return `•••• ${visible}`
}

/** First stored value for a metadata key, or undefined (key may be absent at runtime). */
function firstMeta(metadata: AccountDetails["metadata"], key: string): string | undefined {
  return (metadata[key] ?? [])[0]
}

function AccountCard({ account }: { account: AccountView }) {
  // The list comes from `accounts$` (reactive — re-renders when a statement is
  // imported); the masked-out `metadata` rows are read on demand from the full
  // detail. The streamed snapshot (`account.statement`) drives the figures so
  // the card stays live, while `details` only supplies the identity rows.
  const details = useServices().accounts.getAccountDetails(account.id)
  if (!details) return null

  const model = buildAccountCardModel(account.kind, account.statement)

  const bankDisplay = account.bankId ? getBankDisplay(account.bankId) : undefined
  const bankLabel = bankDisplay?.label
  const offeringLabel =
    (details.bankId && details.offeringId
      ? getOfferingDisplay(details.bankId, details.offeringId)?.label
      : undefined) ?? KIND_DISPLAY[account.kind].label

  const accountNumber = firstMeta(details.metadata, "accountNumber")
  const holderName = firstMeta(details.metadata, "accountHolderName")
  const detailRows = Object.entries(details.metadata).filter(
    ([key, v]) => v.length > 0 && !PROMOTED_KEYS.includes(key as (typeof PROMOTED_KEYS)[number]),
  )

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border">
      {/* Enlarged, faded kind icon embedded in the card background — tinted
          with the bank's brand color when known, else neutral. Sits in the
          right margin of the content band (above the details footer). */}
      <Icon
        name={KIND_DISPLAY[account.kind].icon}
        aria-hidden
        style={bankDisplay?.color ? { color: bankDisplay.color } : undefined}
        className={`pointer-events-none absolute right-2 top-14 size-28 rotate-[-12deg] ${
          bankDisplay?.color ? "opacity-[0.18]" : "text-muted-foreground/25"
        }`}
      />

      {/* Frosted-glass top band: a brand-tinted gradient fading to transparent,
          with a slight backdrop blur over the watermark icon for a glass feel. */}
      <div
        aria-hidden
        style={
          bankDisplay?.color
            ? { background: `linear-gradient(to bottom, color-mix(in srgb, ${bankDisplay.color} 28%, transparent), transparent)` }
            : undefined
        }
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 backdrop-blur-[2px] ${
          bankDisplay?.color ? "" : "bg-gradient-to-b from-muted/50 to-transparent"
        }`}
      />

      {/* Header: two columns — bank identity (left) + balance/due (right). */}
      <div className="relative flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <MoneyAccountIcon account={account} className="size-8 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{bankLabel ?? account.name}</div>
            <div className="truncate text-xs text-muted-foreground">{offeringLabel}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {model.label}
          </div>
          <div className="text-lg font-semibold leading-tight">
            {model.amount !== undefined ? (
              <Money amount={model.amount} currency={account.currency} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          {model.hasStatement && model.asOf !== undefined ? (
            <div className="text-[10px] text-muted-foreground">as of {AS_OF_FMT.format(model.asOf)}</div>
          ) : (
            <div className="text-[10px] text-muted-foreground">No statement yet</div>
          )}
          {model.isCreditCard && model.hasStatement && (
            <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              {model.minimumDue !== undefined && (
                <div>
                  Min due{" "}
                  <Money
                    amount={model.minimumDue}
                    currency={account.currency}
                    className="font-medium text-foreground"
                  />
                </div>
              )}
              {model.dueDate !== undefined && (
                <div>
                  Due date{" "}
                  <span className="font-medium text-foreground">{AS_OF_FMT.format(model.dueDate)}</span>
                </div>
              )}
            </div>
          )}
          {account.archived && (
            <span className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Promoted identity: holder name + masked account number. */}
      {(holderName || accountNumber) && (
        <div className="relative flex flex-col gap-0.5 px-4 pb-3">
          {holderName && <div className="truncate text-sm font-medium">{holderName}</div>}
          {accountNumber && (
            <div className="font-mono text-xs tracking-wider text-muted-foreground">
              {maskNumber(accountNumber)}
            </div>
          )}
        </div>
      )}

      {/* Remaining details — key/value. Pinned to the card bottom so the
          divider aligns across cards of differing content height. The
          credit-limit row is a synthetic, currency-formatted meta (sourced from
          the typed snapshot, never the metadata string-bag). */}
      <dl className="relative mt-auto flex flex-col gap-1 border-t px-4 py-3 text-xs">
        <Row label="Currency" value={account.currency} />
        {model.metaRows.map((row) => (
          <Row
            key={row.key}
            label={row.label}
            value={<Money amount={row.amount} currency={account.currency} />}
          />
        ))}
        {detailRows.map(([key, values]) => (
          <Row key={key} label={humanizeKey(key)} value={values.join(", ")} />
        ))}
        {account.icon && <Row label="Icon" value={account.icon} />}
        <Row label="Entity id" value={<span className="break-all">{account.id}</span>} />
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{value}</dd>
    </div>
  )
}