/** A connected email account as the UI sees it — NO tokens. */
export type ConnectionView = {
  readonly id: string
  readonly provider: string
  readonly email: string
  readonly name: string
  readonly picture: string
  readonly lastSyncedAt?: number // from the joined emailImportSetting.importState.lastImportAt
  readonly hasError: boolean // !!emailImportSetting.lastErrorLogId
}
