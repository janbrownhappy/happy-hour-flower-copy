// Scores a batch of accounts and persists RetentionProfile / ChurnSignal / ChurnScoreHistory.
// Shared by scoreRetention (chunked) and recalcRetentionAccount (single). All context
// (sessions, offer stats, favorites, listings, rollups) is gathered by the caller and passed
// in via the `contextFor` resolver so this module stays free of query strategy.

import {
  evaluateVenue,
  evaluateConsumer,
  buildScore,
  shouldRecordHistory,
} from './churnEvaluate.ts';

// Persist the score for one account. Returns the resulting profile summary.
export async function scoreAndPersistAccount(base44, {
  entityType, source, rulesByKey, ctx, existingProfile, forceWeekly = false, historyReasonOverride = null,
}) {
  const fired = entityType === 'venue'
    ? evaluateVenue(source, rulesByKey, ctx)
    : evaluateConsumer(source, rulesByKey, ctx);

  const s = buildScore({ entityType, source, fired, ctx });
  const now = new Date().toISOString();

  const displayName = entityType === 'venue'
    ? source.name
    : (source.display_name || source.email || '—');
  const email = entityType === 'venue' ? (ctx.ownerEmail || '') : (source.email || '');

  const profileData = {
    entity_type: entityType,
    account_ref_id: source.id,
    consumer_id: entityType === 'consumer' ? (source.created_by_id || source.consumer_id || '') : '',
    venue_id: entityType === 'venue' ? source.id : '',
    owner_id: entityType === 'venue' ? (source.owner_id || '') : '',
    display_name: displayName,
    email,
    subscription_tier: s.tier,
    is_paid: s.isPaid,
    mrr: s.mrr,
    churn_score: s.churnScore,
    previous_churn_score: existingProfile ? (existingProfile.churn_score || 0) : s.churnScore,
    score_change: existingProfile ? s.churnScore - (existingProfile.churn_score || 0) : 0,
    risk_category: s.riskCategory,
    primary_risk_reason: s.primaryReason,
    conversion_score: s.convScore,
    lifecycle_status: s.lifecycleStatus,
    revenue_at_risk: s.revenueAtRisk,
    last_activity_at: ctx.lastActivityIso || null,
    last_scored_at: now,
  };

  let profileId;
  if (existingProfile) {
    await base44.asServiceRole.entities.RetentionProfile.update(existingProfile.id, profileData);
    profileId = existingProfile.id;
  } else {
    const created = await base44.asServiceRole.entities.RetentionProfile.create(profileData);
    profileId = created.id;
  }

  // Sync signals: resolve stale active signals, create/refresh fired ones.
  const existingSignals = await base44.asServiceRole.entities.ChurnSignal.filter(
    { account_ref_id: source.id }, '-detected_at', 100
  ).catch(() => []);
  const firedKeys = new Set(fired.map(f => f.rule_key));
  const existingByKey = {};
  for (const sig of existingSignals) existingByKey[sig.signal_type] = sig;

  for (const f of fired) {
    const prev = existingByKey[f.rule_key];
    if (prev) {
      await base44.asServiceRole.entities.ChurnSignal.update(prev.id, {
        label: f.label, points: f.points, severity: f.severity,
        detected_at: now, resolved_at: null, is_active: true,
      }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.ChurnSignal.create({
        retention_profile_id: profileId,
        account_ref_id: source.id,
        entity_type: entityType,
        signal_type: f.rule_key,
        label: f.label,
        points: f.points,
        severity: f.severity,
        detected_at: now,
        is_active: true,
      }).catch(() => {});
    }
  }
  // Resolve signals no longer firing.
  for (const sig of existingSignals) {
    if (sig.is_active && !firedKeys.has(sig.signal_type)) {
      await base44.asServiceRole.entities.ChurnSignal.update(sig.id, {
        is_active: false, resolved_at: now,
      }).catch(() => {});
    }
  }

  // History — only on meaningful change (keeps the table bounded).
  const hist = historyReasonOverride
    ? { record: true, reason: historyReasonOverride }
    : shouldRecordHistory(existingProfile, s.churnScore, s.riskCategory, forceWeekly);
  if (hist.record) {
    await base44.asServiceRole.entities.ChurnScoreHistory.create({
      retention_profile_id: profileId,
      account_ref_id: source.id,
      entity_type: entityType,
      churn_score: s.churnScore,
      risk_category: s.riskCategory,
      reason: hist.reason,
      recorded_at: now,
    }).catch(() => {});
  }

  return { profileId, ...s, fired };
}

// Build a rulesByKey lookup from ChurnScoringRule records, filtered to a type.
export function buildRulesByKey(rules, entityType) {
  const map = {};
  for (const r of rules) {
    if (!r.is_active) continue;
    if (r.applies_to === 'both' || r.applies_to === entityType) map[r.rule_key] = r;
  }
  return map;
}