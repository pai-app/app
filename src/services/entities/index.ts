import { authAccountEntity } from "./auth-account"
import { tagEntity } from "./tag"
import { userSettingsEntity } from "./user-settings"

export type { AuthAccount } from "./auth-account"
export { authAccountEntity } from "./auth-account"

export type { Tag } from "./tag"
export { tagEntity } from "./tag"

export type { UserSettings } from "./user-settings"
export { USER_SETTINGS_DEFAULTS, userSettingsEntity } from "./user-settings"

export { SYSTEM_TAGS } from "./system-tags"

export const ENTITIES = [userSettingsEntity, authAccountEntity, tagEntity] as const
