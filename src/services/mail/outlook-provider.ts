import type { MailMessage, MailAttachment } from "@fin-app/adapters"
import type { AuthAccount } from "@/services/entities"
import type { EmailPreview } from "@/services/email-types"
import { MailTokenCache } from "./mail-token"
import type {
  EmailSummary,
  MailListOptions,
  MailListPage,
  MailProvider,
} from "./mail-provider"

const GRAPH_API = "https://graph.microsoft.com/v1.0/me/messages"
const PAGE_SIZE = "20"

type GraphMessage = {
  id: string
  receivedDateTime: string
  subject: string
  bodyPreview: string
  body: { contentType: string; content: string }
  from: { emailAddress: { name: string; address: string } }
  toRecipients: Array<{ emailAddress: { name: string; address: string } }>
  hasAttachments?: boolean
  attachments?: GraphAttachment[]
  webLink?: string
}

type GraphAttachment = {
  id: string
  name: string
  contentType: string
  size: number
  isInline: boolean
  contentBytes?: string
}

type MessageListResponse = {
  value: GraphMessage[]
  "@odata.nextLink"?: string
}

/** Microsoft Graph-backed `MailProvider`. */
export class OutlookProvider implements MailProvider {
  readonly name: string
  private readonly tokens: MailTokenCache

  constructor(account: AuthAccount) {
    this.name = account.provider
    this.tokens = new MailTokenCache(account)
  }

  async listMessages(opts: MailListOptions): Promise<MailListPage> {
    const accessToken = await this.tokens.get()
    // Graph paging tokens are full follow-on URLs; reuse them verbatim.
    const url = opts.pageToken ?? `${GRAPH_API}?${buildParams(opts)}`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error(`Outlook search failed: ${res.status}`)

    const data = (await res.json()) as MessageListResponse
    const messages: EmailSummary[] = data.value.map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      from: msg.from.emailAddress.address,
      date: new Date(msg.receivedDateTime).getTime(),
      snippet: msg.bodyPreview,
      hasAttachments: msg.hasAttachments ?? false,
    }))
    return { messages, nextPageToken: data["@odata.nextLink"] }
  }

  async fetchMessage(id: string): Promise<MailMessage> {
    const accessToken = await this.tokens.get()
    const res = await fetch(`${GRAPH_API}/${id}?$expand=attachments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Outlook fetch failed: ${res.status}`)

    const msg = (await res.json()) as GraphMessage
    const attachments = await Promise.all(
      (msg.attachments ?? [])
        .filter((a) => !a.isInline)
        .map((att) => fetchAttachmentBytes(accessToken, id, att)),
    )

    return {
      id: msg.id,
      date: new Date(msg.receivedDateTime).getTime(),
      from: msg.from.emailAddress.address,
      to: msg.toRecipients.map((r) => r.emailAddress.address).join(", "),
      subject: msg.subject,
      body: msg.body.content,
      attachments,
    }
  }

  async fetchPreview(id: string): Promise<EmailPreview> {
    const accessToken = await this.tokens.get()
    const params = new URLSearchParams({
      $select: "from,subject,receivedDateTime,webLink",
      $expand: "attachments($select=name,contentType,size,isInline)",
    })
    const res = await fetch(`${GRAPH_API}/${id}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Outlook preview failed: ${res.status}`)

    const msg = (await res.json()) as GraphMessage
    const attachments = (msg.attachments ?? [])
      .filter((a) => !a.isInline)
      .map((a) => ({ filename: a.name, mimeType: a.contentType, size: a.size }))

    return {
      from: msg.from.emailAddress.address,
      subject: msg.subject,
      date: new Date(msg.receivedDateTime).getTime(),
      attachments,
      webLink: msg.webLink ?? "",
    }
  }
}

// ── Query building ──────────────────────────────────────

/** Graph `received<=` is day-granular; add a day so the bound is inclusive. */
function graphDateParam(epochMs: number): string {
  const d = new Date(epochMs + 24 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

/**
 * Build the listing params. Graph's `$search` (KQL) cannot combine with
 * `$filter`/`$orderby`, so all criteria go into one KQL string when present;
 * otherwise fall back to a date-ordered listing.
 */
function buildParams({ query, before }: MailListOptions): string {
  const params = new URLSearchParams({
    $top: PAGE_SIZE,
    $select: "id,subject,from,receivedDateTime,bodyPreview,hasAttachments",
  })

  const kql: string[] = []
  if (query.subject) kql.push(`subject:${query.subject}`)
  if (query.domains?.length) kql.push(`(${query.domains.map((d) => `from:${d}`).join(" OR ")})`)
  if (before) kql.push(`received<=${graphDateParam(before.date)}`)

  if (kql.length > 0) {
    params.set("$search", `"${kql.join(" AND ")}"`)
  } else {
    params.set("$orderby", "receivedDateTime DESC")
  }
  return params.toString()
}

// ── Attachment bytes ────────────────────────────────────

async function fetchAttachmentBytes(
  accessToken: string,
  messageId: string,
  meta: GraphAttachment,
): Promise<MailAttachment> {
  const res = await fetch(`${GRAPH_API}/${messageId}/attachments/${meta.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Attachment fetch failed: ${res.status}`)

  const data = (await res.json()) as GraphAttachment
  const binary = atob(data.contentBytes ?? "")
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { id: meta.id, filename: meta.name, mimeType: meta.contentType, size: meta.size, bytes }
}
