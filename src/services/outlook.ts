/**
 * Microsoft Graph Mail API client for searching and fetching emails.
 * Uses the connected auth account's refresh token to get a fresh access token
 * via the BFF feature-refresh flow.
 */

import { clientAuth } from "@/lib/strata-config"
import type { AuthAccount } from "@/services/entities"
import type { MailMessage, MailAttachment } from "@fin-app/adapters"
import type { EmailSummary } from "@/services/gmail"
import type { EmailPreview } from "@/services/email-types"

const GRAPH_API = "https://graph.microsoft.com/v1.0/me/messages"

// ── Graph API types ─────────────────────────────────────

type MessageListResponse = {
  value: MessageResponse[]
  "@odata.nextLink"?: string
}

type MessageResponse = {
  id: string
  receivedDateTime: string
  subject: string
  bodyPreview: string
  body: { contentType: string; content: string }
  from: { emailAddress: { name: string; address: string } }
  toRecipients: Array<{ emailAddress: { name: string; address: string } }>
  attachments?: AttachmentResponse[]
  webLink?: string
}

type AttachmentResponse = {
  id: string
  name: string
  contentType: string
  size: number
  isInline: boolean
}

type AttachmentContentResponse = {
  id: string
  name: string
  contentType: string
  size: number
  contentBytes: string
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

export async function searchOutlookEmails(
  account: AuthAccount,
  subject: string,
  after?: string,
  before?: string,
): Promise<EmailSummary[]> {
  const accessToken = await getAccessToken(account)

  // Graph API: $search and $filter/$orderby cannot be combined.
  // Use $search with KQL for all criteria, or $filter+$orderby when no text search.
  const params = new URLSearchParams({
    $top: "20",
    $select: "id,subject,from,receivedDateTime,bodyPreview,hasAttachments",
  })

  const hasTextSearch = !!subject || !!after || !!before
  if (hasTextSearch) {
    // Build KQL query for $search
    const kqlParts: string[] = []
    if (subject) kqlParts.push(`subject:${subject}`)
    if (after) kqlParts.push(`received>=${after}`)
    if (before) kqlParts.push(`received<=${before}`)
    params.set("$search", `"${kqlParts.join(" AND ")}"`)
  } else {
    params.set("$orderby", "receivedDateTime DESC")
  }

  const res = await fetch(`${GRAPH_API}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Outlook search failed: ${res.status}`)

  const data = (await res.json()) as MessageListResponse
  return data.value.map((msg) => ({
    id: msg.id,
    subject: msg.subject,
    from: msg.from.emailAddress.address,
    date: new Date(msg.receivedDateTime),
    snippet: msg.bodyPreview,
    hasAttachments: (msg.attachments ?? []).some((a) => !a.isInline),
  }))
}

// ── Fetch full email for parsing ────────────────────────

export async function fetchFullOutlookEmail(
  account: AuthAccount,
  messageId: string,
): Promise<MailMessage> {
  const accessToken = await getAccessToken(account)

  const params = new URLSearchParams({
    $expand: "attachments",
  })
  const res = await fetch(`${GRAPH_API}/${messageId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Outlook fetch failed: ${res.status}`)

  const msg = (await res.json()) as MessageResponse

  const attachmentMeta = (msg.attachments ?? []).filter((a) => !a.isInline)
  const resolvedAttachments = await Promise.all(
    attachmentMeta.map((att) => fetchAttachmentBytes(accessToken, messageId, att)),
  )

  return {
    id: msg.id,
    date: new Date(msg.receivedDateTime).getTime(),
    from: msg.from.emailAddress.address,
    to: msg.toRecipients.map((r) => r.emailAddress.address).join(", "),
    subject: msg.subject,
    body: msg.body.content,
    attachments: resolvedAttachments,
  }
}

// ── Email preview (metadata only, no bytes) ─────────────

export async function fetchOutlookPreview(
  account: AuthAccount,
  messageId: string,
): Promise<EmailPreview> {
  const accessToken = await getAccessToken(account)

  const params = new URLSearchParams({
    $select: "from,subject,receivedDateTime,webLink",
    $expand: "attachments($select=name,contentType,size,isInline)",
  })
  const res = await fetch(`${GRAPH_API}/${messageId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Outlook preview failed: ${res.status}`)

  const msg = (await res.json()) as MessageResponse

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

// ── Attachment helpers ──────────────────────────────────

async function fetchAttachmentBytes(
  accessToken: string,
  messageId: string,
  meta: AttachmentResponse,
): Promise<MailAttachment> {
  const res = await fetch(
    `${GRAPH_API}/${messageId}/attachments/${meta.id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`Attachment fetch failed: ${res.status}`)

  const data = (await res.json()) as AttachmentContentResponse
  const binary = atob(data.contentBytes)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return {
    id: meta.id,
    filename: meta.name,
    mimeType: meta.contentType,
    size: meta.size,
    bytes,
  }
}
