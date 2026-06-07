import { useState } from "react"
import { useStrata } from "@strata/plugins-ui"
import type { BaseEntity } from "@strata/core"
import { authAccountEntity } from "@/services/entities/auth-account"
import type { ImportLog } from "@/services/entities/import-log"
import { fetchEmailPreview, type EmailPreview } from "@/services/email-preview"

export type EmailPreviewState = {
  readonly email: EmailPreview | null
  readonly loading: boolean
}

/**
 * Fetches email metadata (from/subject/attachments/webLink) for an
 * email-source import log. Returns `{ email: null, loading: false }` for file
 * sources or when nothing is loaded.
 *
 * Uses the set-state-during-render guard pattern (not an effect) to comply
 * with the no-set-state-in-effect rule. Keyed on `logId:emailId`, so the
 * preview refreshes if the same log moves to a different email.
 */
export function useEmailPreview(log: (ImportLog & BaseEntity) | null): EmailPreviewState {
  const strata = useStrata()
  const [email, setEmail] = useState<EmailPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchedFor, setFetchedFor] = useState<string | null>(null)

  const source = log?.source
  const emailId = source?.kind === "email" ? source.emailId : undefined
  const key = log && emailId ? `${log.id}:${emailId}` : null

  if (key && key !== fetchedFor && strata && source?.kind === "email" && source.emailId) {
    setFetchedFor(key)
    setEmail(null)
    setLoading(true)
    const account = strata.repo(authAccountEntity).get(source.authAccountId)
    if (account) {
      void fetchEmailPreview(account, source.emailId)
        .then(setEmail)
        .catch(() => { /* best-effort */ })
        .finally(() => { setLoading(false) })
    } else {
      setLoading(false)
    }
  }

  // Reset when the active log clears, so a reopened file sheet shows no stale
  // email metadata.
  if (!key && fetchedFor !== null) {
    setFetchedFor(null)
    setEmail(null)
    setLoading(false)
  }

  return { email, loading }
}
