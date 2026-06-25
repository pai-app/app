import { authAccountEntity } from "./auth-account"
import { emailImportSettingEntity } from "./email-import-setting"
import { importLogEntity } from "./import-log"
import { importSourceEntity } from "./import-source"
import { moneyAccountEntity } from "./money-account"
import { notificationEntity } from "./notification"
import { tagEntity } from "./tag"
import { tagRuleEntity } from "./tag-rule"
import { transactionEntity } from "./transaction"
import { userSettingsEntity } from "./user-settings"

export { authAccountEntity } from "./auth-account"
export { emailImportSettingEntity } from "./email-import-setting"
export { importLogEntity } from "./import-log"
export { importSourceEntity, importSourceMonthKey } from "./import-source"
export { moneyAccountEntity } from "./money-account"
export { notificationEntity } from "./notification"
export { tagEntity } from "./tag"
export { tagRuleEntity } from "./tag-rule"
export { transactionEntity } from "./transaction"
export { userSettingsEntity } from "./user-settings"

export const ENTITIES = [
  userSettingsEntity,
  authAccountEntity,
  tagEntity,
  tagRuleEntity,
  moneyAccountEntity,
  transactionEntity,
  importLogEntity,
  importSourceEntity,
  emailImportSettingEntity,
  notificationEntity,
] as const
