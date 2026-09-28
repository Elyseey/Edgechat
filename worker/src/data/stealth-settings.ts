import { randomToken } from '../utils.js';

export interface StealthSettings {
  enabled: boolean;
  loginPath: string;
  apiPrefix: string;
  formId: string;
  variant: number;
}

export async function getStealthSettings(db): Promise<StealthSettings | null> {
  const { results } = await db.prepare(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'stealth_mode'",
  ).all();
  return results[0] ? JSON.parse(results[0].setting_value) : null;
}

export async function saveStealthSettings(db, enabled: boolean) {
  const existing = await getStealthSettings(db);
  const settings: StealthSettings = {
    enabled,
    loginPath: existing?.loginPath || `/${randomToken(18)}`,
    apiPrefix: existing?.apiPrefix || `/${randomToken(18)}`,
    formId: existing?.formId || `f${randomToken(9)}`,
    variant: existing?.variant ?? crypto.getRandomValues(new Uint8Array(1))[0] % 3,
  };
  // 存在既有设置表中，随机标识只在首次配置时生成，重新部署不会使正在使用的入口失效。
  await db.prepare(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at)
     VALUES ('stealth_mode', ?, CURRENT_TIMESTAMP)
     ON CONFLICT(setting_key) DO UPDATE
     SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`,
  ).bind(JSON.stringify(settings)).run();
  return settings;
}
