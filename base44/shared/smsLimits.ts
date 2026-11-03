// Admin-configurable SMS blast limits per venue tier, stored in AppSetting 'sms_tier_limits'.
export const SMS_LIMITS_KEY = 'sms_tier_limits';
export const DEFAULT_SMS_LIMITS = {
  premium: { daily: 1, weekly: 2 },
  platinum: { daily: 2, weekly: 4 },
  platinum_plus: { daily: 3, weekly: 6 },
};

export async function loadSmsLimits(sr) {
  const rows = await sr.entities.AppSetting.filter({ key: SMS_LIMITS_KEY });
  let saved = {};
  try { saved = JSON.parse(rows[0]?.value_string || '{}'); } catch { saved = {}; }
  const out = {};
  for (const t of Object.keys(DEFAULT_SMS_LIMITS)) out[t] = { ...DEFAULT_SMS_LIMITS[t], ...(saved[t] || {}) };
  return out;
}

export function periodStarts(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const week = new Date(day);
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7)); // back to Monday
  return { day: day.toISOString(), week: week.toISOString() };
}