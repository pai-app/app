export type { Connection } from "./connection"
export { connectionEntity } from "./connection"

export type { EmailImportCursor, EmailImportSetting, EmailImportState } from "./email-import-setting"
export { emailImportSettingEntity } from "./email-import-setting"

export type {
  ImportLog,
  ImportLogEmailRun,
  ImportLogEmailSource,
  ImportLogError,
  ImportLogFileSource,
  ImportLogSource,
  ImportLogStatus,
  ImportLogTrigger,
  ImportPromptPayload,
} from "./import-log"
export { sweepProgress, importLogEntity } from "./import-log"

export type { ImportSource, ImportSourceDescriptor } from "./import-source"
export { importSourceEntity, importSourceMonthKey } from "./import-source"

export type { Money } from "./money"

export type { Account, AccountKind, AccountRow, AccountStatement } from "./account"
export { accountEntity } from "./account"

export type { Notification, NotificationRef } from "./notification"
export { notificationEntity } from "./notification"

export type { Tag } from "./tag"
export { tagEntity } from "./tag"

export type { TagRule } from "./tag-rule"
export { tagRuleEntity } from "./tag-rule"

export type { Transaction } from "./transaction"
export { transactionEntity } from "./transaction"

export type { UserSettings } from "./user-settings"
export { USER_SETTINGS_DEFAULTS } from "./user-settings"
export { userSettingsEntity } from "./user-settings"

import { connectionEntity } from "./connection"
import { emailImportSettingEntity } from "./email-import-setting"
import { importLogEntity } from "./import-log"
import { importSourceEntity } from "./import-source"
import { accountEntity } from "./account"
import { notificationEntity } from "./notification"
import { tagEntity } from "./tag"
import { tagRuleEntity } from "./tag-rule"
import { transactionEntity } from "./transaction"
import { userSettingsEntity } from "./user-settings"

export const ENTITIES = [
  userSettingsEntity,
  connectionEntity,
  tagEntity,
  tagRuleEntity,
  accountEntity,
  transactionEntity,
  importLogEntity,
  importSourceEntity,
  emailImportSettingEntity,
  notificationEntity,
] as const
