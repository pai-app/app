import { defineEntity } from "@fyre-db/core"
import type { EmailImportSetting } from "@/entities/email-import-setting"

export const emailImportSettingEntity = defineEntity<EmailImportSetting>(
  "email-import-setting",
  {
    keyStrategy: "global",
    // authAccountId is a FyreDb composite id (e.g. "auth-account._.google:email:123")
    // which contains dots — dots are reserved as FyreDb key separators, so replace them.
    deriveId: (s) => s.authAccountId.replaceAll(".", "-"),
  },
)
