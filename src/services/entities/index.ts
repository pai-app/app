import { authAccountEntity } from "./auth-account"
import { emailImportSettingEntity } from "./email-import-setting"
import { importLogEntity } from "./import-log"
import { importSourceEntity } from "./import-source"
import { moneyAccountEntity } from "./money-account"
import { notificationEntity } from "./notification"
import { tagEntity } from "./tag"
import { transactionEntity } from "./transaction"
import { userSettingsEntity } from "./user-settings"

export type { AuthAccount } from "./auth-account"
export { authAccountEntity } from "./auth-account"

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
export { importLogEntity } from "./import-log"

export type { ImportSource, ImportSourceDescriptor } from "./import-source"
export { importSourceEntity, importSourceMonthKey } from "./import-source"

export type { Money } from "./money"

export type { MoneyAccount, MoneyAccountKind } from "./money-account"
export { moneyAccountEntity } from "./money-account"

export type { Notification, NotificationRef } from "./notification"
export { notificationEntity } from "./notification"

export type { Tag } from "./tag"
export { tagEntity } from "./tag"

export type { Transaction } from "./transaction"
export { transactionEntity } from "./transaction"

export type { UserSettings } from "./user-settings"
export { USER_SETTINGS_DEFAULTS, userSettingsEntity } from "./user-settings"

export { SYSTEM_TAGS } from "./system-tags"

export const ENTITIES = [
  userSettingsEntity,
  authAccountEntity,
  tagEntity,
  moneyAccountEntity,
  transactionEntity,
  importLogEntity,
  importSourceEntity,
  emailImportSettingEntity,
  notificationEntity,
] as const
