// Per-user daily counter stored in AppSetting (written via service role).
// Returns true when the call is allowed (and counts it), false once the limit is reached.
export async function consumeDailyQuota(svc, name, userId, limit) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `quota:${name}:${userId}:${day}`;
  const [row] = await svc.entities.AppSetting.filter({ key });
  const used = Number(row?.value_string || 0);
  if (used >= limit) return false;
  if (row) await svc.entities.AppSetting.update(row.id, { value_string: String(used + 1) });
  else await svc.entities.AppSetting.create({ key, value_string: '1' });
  return true;
}