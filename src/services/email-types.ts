// ── Email preview types ─────────────────────────────────

export type EmailAttachmentMeta = {
  readonly filename: string
  readonly mimeType: string
  readonly size: number       // bytes
}

export type EmailPreview = {
  readonly from: string
  readonly subject: string
  readonly date: number                                 // ms epoch
  readonly attachments: ReadonlyArray<EmailAttachmentMeta>
  /** Deep link to the email in its provider's web client. */
  readonly webLink: string
}
