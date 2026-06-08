import { parseFile, ParseError } from "@fin-app/adapters"
import type { ImportData } from "@fin-app/adapters"
import type { Repository } from "@strata/core"
import { ImportContext } from "./import-context"
import { CancelledError, throwIfCancelled, findMatchingAccounts, hashAndDedup } from "./import-utils"
import type { HashedTransaction } from "./import-utils"
import type { MoneyAccount } from "@/services/entities/money-account"
import type { Transaction } from "@/services/entities/transaction"

// ── Result ──────────────────────────────────────────────

export type FileImportResult = {
  readonly importData: ImportData
  readonly adapterId: string
  readonly accountId: string
  readonly newAccount: boolean
  readonly transactions: ReadonlyArray<HashedTransaction>
  readonly newCount: number
  readonly duplicateCount: number
  /** Passwords the user entered during this run (not yet in the vault). */
  readonly newPasswords: ReadonlyArray<string>
}

// ── Runner ──────────────────────────────────────────────

/**
 * Run a file import to completion (or until cancelled / needs_input).
 * Pure function — all state is on `ctx`; all persistence is via the repos
 * passed in. Returns a result when the user confirms.
 */
export async function runFileImport(
  ctx: ImportContext,
  file: File,
  filePasswords: readonly string[],
  accountRepo: Repository<MoneyAccount>,
  transactionRepo: Repository<Transaction>,
): Promise<FileImportResult> {
  ctx.status = "in_progress"

  // 1. Parse file (handles passwords via prompt loop)
  const passwords = [...filePasswords]
  let data: ImportData | null
  for (;;) {
    throwIfCancelled(ctx)
    try {
      data = await parseFile(file, passwords)
      break
    } catch (err) {
      if (err instanceof ParseError && err.kind === "password-required") {
        const answer = await ctx.waitForAnswer({ kind: "password" })
        throwIfCancelled(ctx)
        if (answer.kind !== "password") throw new Error("Unexpected answer kind", { cause: err })
        passwords.push(answer.password)
        ctx.status = "in_progress"
        continue
      }
      throw err
    }
  }

  if (!data) throw new Error("No adapter matched this file")

  const adapterId = `${data.bankId}/${data.offeringId}`
  throwIfCancelled(ctx)

  // 2. Resolve account
  const accountId = await resolveAccount(ctx, data, accountRepo)
  throwIfCancelled(ctx)

  // 3. Hash & dedup
  const hashed = hashAndDedup(data, transactionRepo)
  throwIfCancelled(ctx)

  const newCount = hashed.filter((t) => t.isNew).length
  const duplicateCount = hashed.length - newCount

  // 4. Confirm
  const confirmAnswer = await ctx.waitForAnswer({
    kind: "confirm",
    parsed: hashed.length,
    newCount,
    duplicate: duplicateCount,
  })
  throwIfCancelled(ctx)
  if (confirmAnswer.kind !== "confirm" || !confirmAnswer.confirmed) {
    throw new CancelledError()
  }
  ctx.status = "in_progress"

  // Figure out which passwords are new (not in the original vault)
  const origSet = new Set(filePasswords)
  const newPasswords = passwords.filter((p) => !origSet.has(p))

  return {
    importData: data,
    adapterId,
    accountId,
    newAccount: accountId === "",
    transactions: hashed,
    newCount,
    duplicateCount,
    newPasswords,
  }
}

// ── Helpers ─────────────────────────────────────────────

async function resolveAccount(
  ctx: ImportContext,
  data: ImportData,
  accountRepo: Repository<MoneyAccount>,
): Promise<string> {
  const all = accountRepo.query()
  const matches = findMatchingAccounts(all, data.bankId, data.account)

  if (matches.length === 0) return ""
  if (matches.length === 1) return matches[0].id

  const answer = await ctx.waitForAnswer({
    kind: "account-selection",
    accountIds: matches.map((a) => a.id),
  })
  throwIfCancelled(ctx)
  if (answer.kind !== "account-selection") throw new Error("Unexpected answer kind")
  ctx.status = "in_progress"
  return answer.accountId
}
