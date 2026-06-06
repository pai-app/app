/**
 * Gmail API client for searching and fetching emails.
 * Uses the connected auth account's refresh token to get a fresh access token
 * via the BFF feature-refresh flow.
 */

import { clientAuth } from "@/lib/strata-config"
import type { AuthAccount } from "@/services/entities"
import type { MailMessage, MailAttachment } from "@fin-app/adapters"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

// ── Gmail API types ─────────────────────────────────────

type MessageListResponse = {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

type MessageResponse = {
  id: string
  snippet: string
  payload: MessagePart
  internalDate: string
}

type MessagePart = {
  partId: string
  mimeType: string
  filename: string
  headers: Array<{ name: string; value: string }>
  body: { attachmentId?: string; size: number; data?: string }
  parts?: MessagePart[] | undefined
}

type AttachmentResponse = {
  data: string
  size: number
}

// ── Public types ────────────────────────────────────────

export type EmailSummary = {
  readonly id: string
  readonly subject: string
  readonly from: string
  readonly date: Date
  readonly snippet: string
  readonly hasAttachments: boolean
}

// ── Token management ────────────────────────────────────

async function getAccessToken(account: AuthAccount): Promise<string> {
  const result = await clientAuth.getFeatureToken(
    account.provider,
    account.feature,
    account.refreshToken,
  )
  if (!result) throw new Error("Failed to refresh feature token")
  return result.token
}

// ── Search ──────────────────────────────────────────────

export async function searchEmails(
  account: AuthAccount,
  subject: string,
  after?: string,
  before?: string,
): Promise<EmailSummary[]> {
  const accessToken = await getAccessToken(account)

  const queryParts: string[] = []
  if (subject) queryParts.push(`subject:(${subject})`)
  if (after) queryParts.push(`after:${after}`)
  if (before) queryParts.push(`before:${before}`)

  const params = new URLSearchParams({
    maxResults: "20",
    q: queryParts.join(" "),
  })

  const res = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gmail search failed: ${res.status}`)

  const data = (await res.json()) as MessageListResponse
  if (!data.messages?.length) return []

  return fetchMessageSummaries(accessToken, data.messages.map((m) => m.id))
}

// ── Fetch summaries (batch) ─────────────────────────────

async function fetchMessageSummaries(
  accessToken: string,
  ids: string[],
): Promise<EmailSummary[]> {
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
      const msg = JSON.parse(jsonMatch[1]) as MessageResponse
      if (!msg.id) continue
      const getHeader = (name: string) =>
        msg.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
      const fromRaw = getHeader("From")
      results.push({
        id: msg.id,
        subject: getHeader("Subject"),
        from: fromRaw.match(/<(.+)>/)?.[1] ?? fromRaw,
        date: new Date(getHeader("Date") || parseInt(msg.internalDate)),
        snippet: msg.snippet,
        hasAttachments: hasAttachmentParts(msg.payload),
      })
    } catch {
      // skip malformed
    }
  }

  return results
}

function hasAttachmentParts(part: MessagePart): boolean {
  if (part.filename && part.body.attachmentId) return true
  return part.parts?.some(hasAttachmentParts) ?? false
}

// ── Fetch full email for parsing ────────────────────────

export async function fetchFullEmail(
  account: AuthAccount,
  messageId: string,
): Promise<MailMessage> {
  const accessToken = await getAccessToken(account)

  const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gmail fetch failed: ${res.status}`)

  const msg = (await res.json()) as MessageResponse
  const getHeader = (name: string) =>
    msg.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""

  const fromRaw = getHeader("From")
  const from = fromRaw.match(/<(.+)>/)?.[1] ?? fromRaw

  const attachments = collectAttachmentMeta(msg.payload)
  const resolvedAttachments = await Promise.all(
    attachments.map((att) => fetchAttachmentBytes(accessToken, messageId, att)),
  )

  return {
    id: msg.id,
    date: parseInt(msg.internalDate),
    from,
    to: getHeader("To"),
    subject: getHeader("Subject"),
    body: parseBody(msg.payload),
    attachments: resolvedAttachments,
  }
}

// ── Attachment helpers ──────────────────────────────────

type AttachmentMeta = {
  id: string
  filename: string
  mimeType: string
  size: number
}

function collectAttachmentMeta(part: MessagePart): AttachmentMeta[] {
  const results: AttachmentMeta[] = []
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

async function fetchAttachmentBytes(
  accessToken: string,
  messageId: string,
  meta: AttachmentMeta,
): Promise<MailAttachment> {
  const res = await fetch(
    `${GMAIL_API}/messages/${messageId}/attachments/${meta.id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`Attachment fetch failed: ${res.status}`)

  const data = (await res.json()) as AttachmentResponse
  const binary = atob(data.data.replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return {
    id: meta.id,
    filename: meta.filename,
    mimeType: meta.mimeType,
    size: meta.size,
    bytes,
  }
}

function parseBody(part: MessagePart): string {
  if (part.body.data) {
    return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"))
  }
  if (part.parts) {
    for (const sub of part.parts) {
      const result = parseBody(sub)
      if (result) return result
    }
  }
  return ""
}
