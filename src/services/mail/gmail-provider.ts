import type { MailMessage, MailAttachment } from "@pai-app/adapters"
import type { AuthAccount } from "@/entities"
import type { EmailPreview } from "@/services/email-types"
import { MailTokenCache } from "./mail-token"
import type {
  EmailSummary,
  MailListOptions,
  MailListPage,
  MailProvider,
} from "./mail-provider"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
const PAGE_SIZE = "20"

// ── Gmail API types ─────────────────────────────────────

type GmailMessagePart = {
  partId: string
  mimeType: string
  filename: string
  headers: Array<{ name: string; value: string }>
  body: { attachmentId?: string; size: number; data?: string }
  parts?: GmailMessagePart[] | undefined
}

type GmailMessageResponse = {
  id: string
  snippet: string
  payload: GmailMessagePart
  internalDate: string
}

type GmailAttachmentMeta = {
  readonly id: string
  readonly filename: string
  readonly mimeType: string
  readonly size: number
}

type MessageListResponse = {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
}

type AttachmentResponse = { data: string; size: number }

/** Gmail-backed `MailProvider`. */
export class GmailProvider implements MailProvider {
  readonly name: string
  private readonly tokens: MailTokenCache

  constructor(account: AuthAccount) {
    this.name = account.provider
    this.tokens = new MailTokenCache(account)
  }

  async listMessages(opts: MailListOptions): Promise<MailListPage> {
    const accessToken = await this.tokens.get()
    const params = new URLSearchParams({ maxResults: PAGE_SIZE, q: buildQuery(opts) })
    if (opts.pageToken) params.set("pageToken", opts.pageToken)

    const res = await fetch(`${GMAIL_API}/messages?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Gmail search failed: ${res.status}`)

    const data = (await res.json()) as MessageListResponse
    if (!data.messages?.length) return { messages: [], nextPageToken: data.nextPageToken }

    const messages = await fetchMessageSummaries(accessToken, data.messages.map((m) => m.id))
    return { messages, nextPageToken: data.nextPageToken }
  }

  async fetchMessage(id: string): Promise<MailMessage> {
    const accessToken = await this.tokens.get()
    const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Gmail fetch failed: ${res.status}`)

    const msg = (await res.json()) as GmailMessageResponse
    const attachments = await Promise.all(
      collectAttachmentMeta(msg.payload).map((att) => fetchAttachmentBytes(accessToken, id, att)),
    )

    return {
      id: msg.id,
      date: parseInt(msg.internalDate),
      from: parseFromHeader(gmailHeader(msg.payload, "From")),
      to: gmailHeader(msg.payload, "To"),
      subject: gmailHeader(msg.payload, "Subject"),
      body: parseBody(msg.payload),
      attachments,
    }
  }

  async fetchPreview(id: string): Promise<EmailPreview> {
    const accessToken = await this.tokens.get()
    const res = await fetch(
      `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) throw new Error(`Gmail preview failed: ${res.status}`)

    const msg = (await res.json()) as GmailMessageResponse
    const attachments = collectAttachmentMeta(msg.payload).map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
    }))

    return {
      from: parseFromHeader(gmailHeader(msg.payload, "From")),
      subject: gmailHeader(msg.payload, "Subject"),
      date: parseInt(msg.internalDate),
      attachments,
      webLink: `https://mail.google.com/mail/u/0/#all/${id}`,
    }
  }
}

// ── Query building ──────────────────────────────────────

/** Gmail `before:` is day-granular; add a day so the bound is inclusive. */
function gmailDateParam(epochMs: number): string {
  const d = new Date(epochMs + 24 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`
}

function buildQuery({ query, before }: MailListOptions): string {
  const parts: string[] = []
  if (query.subject) parts.push(`subject:(${query.subject})`)
  if (query.domains?.length) parts.push(`from:(${query.domains.join(" OR ")})`)
  if (before) parts.push(`before:${gmailDateParam(before.date)}`)
  return parts.join(" ")
}

// ── Summary batch fetch ─────────────────────────────────

async function fetchMessageSummaries(accessToken: string, ids: string[]): Promise<EmailSummary[]> {
  const boundary = `batch_${Date.now()}`
  const body = ids
    .map(
      (id, i) =>
        `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <item${i}>\r\n\r\n` +
        `GET /gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date\r\n\r\n`,
    )
    .join("") + `--${boundary}--`

  const res = await fetch("https://gmail.googleapis.com/batch/gmail/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body,
  })

  const text = await res.text()
  const results: EmailSummary[] = []
  for (const part of text.split(/--batch_/)) {
    const jsonMatch = part.match(/\r\n\r\n(\{[\s\S]*\})/)
    if (!jsonMatch) continue
    try {
      const msg = JSON.parse(jsonMatch[1]) as GmailMessageResponse
      if (!msg.id) continue
      const dateHeader = gmailHeader(msg.payload, "Date")
      results.push({
        id: msg.id,
        subject: gmailHeader(msg.payload, "Subject"),
        from: parseFromHeader(gmailHeader(msg.payload, "From")),
        date: new Date(dateHeader || parseInt(msg.internalDate)).getTime(),
        snippet: msg.snippet,
        hasAttachments: hasAttachmentParts(msg.payload),
      })
    } catch {
      // skip malformed part
    }
  }
  return results
}

// ── Attachment bytes ────────────────────────────────────

async function fetchAttachmentBytes(
  accessToken: string,
  messageId: string,
  meta: GmailAttachmentMeta,
): Promise<MailAttachment> {
  const res = await fetch(`${GMAIL_API}/messages/${messageId}/attachments/${meta.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Attachment fetch failed: ${res.status}`)

  const data = (await res.json()) as AttachmentResponse
  const binary = decodeBase64Url(data.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return { id: meta.id, filename: meta.filename, mimeType: meta.mimeType, size: meta.size, bytes }
}

// ── Message parsing (pure) ──────────────────────────────

/** Case-insensitive header lookup on a Gmail payload. */
function gmailHeader(payload: GmailMessagePart, name: string): string {
  return payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

/** Unwrap a `From` header to the bare address when angle-bracketed. */
function parseFromHeader(raw: string): string {
  return raw.match(/<(.+)>/)?.[1] ?? raw
}

/** Decode a base64url string (Gmail's body/attachment encoding). */
function decodeBase64Url(data: string): string {
  return atob(data.replace(/-/g, "+").replace(/_/g, "/"))
}

/** True when any part (recursively) is a real attachment. */
function hasAttachmentParts(part: GmailMessagePart): boolean {
  if (part.filename && part.body.attachmentId) return true
  return part.parts?.some(hasAttachmentParts) ?? false
}

/** Collect attachment metadata across all nested parts. */
function collectAttachmentMeta(part: GmailMessagePart): GmailAttachmentMeta[] {
  const results: GmailAttachmentMeta[] = []
  if (part.filename && part.body.attachmentId) {
    results.push({
      id: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.body.size,
    })
  }
  if (part.parts) {
    for (const sub of part.parts) results.push(...collectAttachmentMeta(sub))
  }
  return results
}

/** First decodable body across nested parts. */
function parseBody(part: GmailMessagePart): string {
  if (part.body.data) return decodeBase64Url(part.body.data)
  if (part.parts) {
    for (const sub of part.parts) {
      const result = parseBody(sub)
      if (result) return result
    }
  }
  return ""
}
