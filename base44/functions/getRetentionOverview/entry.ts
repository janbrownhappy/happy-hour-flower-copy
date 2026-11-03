import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Aggregates the executive KPIs for the Retention dashboard from RetentionProfile rows,
// so the browser never loads all 51k accounts. Admin-only. Also folds in live MRR from
// getStripeMRR. Returns compact aggregates + the top at-risk accounts for the attention panel.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Page through RetentionProfile in bounded chunks to build aggregates.
    const PAGE = 5000;
    let offset = 0;
    let page = await base44.asServiceRole.entities.RetentionProfile.list('-churn_score', PAGE, offset).catch(() => []);

    const agg = {
      total: 0,
      by_category: { healthy: 0, watch: 0, at_risk: 0, high_risk: 0, critical: 0 },
      by_type: { consumer: 0, venue: 0 },
      paid_count: 0,
      mrr_total: 0,
      consumer_mrr: 0,
      venue_mrr: 0,
      mrr_at_risk: 0,
      predicted_30d_loss: 0,
      score_sum: 0,
      critical_count: 0,
      high_risk_count: 0,
      lifecycle: { active: 0, cooling: 0, dormant: 0, churned: 0, reactivated: 0 },
    };
    const topAtRisk = [];

    const consume = (rows) => {
      for (const r of rows) {
        agg.total++;
        const cat = r.risk_category || 'healthy';
        if (agg.by_category[cat] != null) agg.by_category[cat]++;
        if (agg.by_type[r.entity_type] != null) agg.by_type[r.entity_type]++;
        agg.score_sum += r.churn_score || 0;
        if (r.is_paid) {
          agg.paid_count++;
          agg.mrr_total += r.mrr || 0;
          if (r.entity_type === 'consumer') agg.consumer_mrr += r.mrr || 0;
          else agg.venue_mrr += r.mrr || 0;
          agg.mrr_at_risk += r.revenue_at_risk || 0;
          agg.predicted_30d_loss += (r.mrr || 0) * ((r.churn_score || 0) / 100);
        }
        if (cat === 'critical') agg.critical_count++;
        if (cat === 'high_risk') agg.high_risk_count++;
        if (r.lifecycle_status && agg.lifecycle[r.lifecycle_status] != null) agg.lifecycle[r.lifecycle_status]++;
        if ((cat === 'critical' || cat === 'high_risk') && topAtRisk.length < 12) {
          topAtRisk.push({
            id: r.id, entity_type: r.entity_type, account_ref_id: r.account_ref_id,
            display_name: r.display_name, churn_score: r.churn_score, risk_category: cat,
            primary_risk_reason: r.primary_risk_reason, mrr: r.mrr, revenue_at_risk: r.revenue_at_risk,
          });
        }
      }
    };

    consume(page);
    while (page.length === PAGE) {
      offset += PAGE;
      page = await base44.asServiceRole.entities.RetentionProfile.list('-churn_score', PAGE, offset).catch(() => []);
      consume(page);
    }

    // Live MRR from Stripe (source of truth for the headline number).
    let liveMrr = null;
    try {
      const mrrRes = await base44.asServiceRole.functions.invoke('getStripeMRR', {});
      liveMrr = mrrRes?.data?.mrr ?? mrrRes?.mrr ?? null;
    } catch { liveMrr = null; }

    // Last scoring-run info.
    const lastRunRows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'retention_scoring_lastrun' }).catch(() => []);
    let lastRun = null;
    if (lastRunRows[0]?.value_string) { try { lastRun = JSON.parse(lastRunRows[0].value_string); } catch { lastRun = null; } }

    const avgScore = agg.total > 0 ? Math.round(agg.score_sum / agg.total) : 0;

    return Response.json({
      success: true,
      totals: {
        accounts: agg.total,
        consumers: agg.by_type.consumer,
        venues: agg.by_type.venue,
        paid: agg.paid_count,
        avg_churn_score: avgScore,
        critical: agg.critical_count,
        high_risk: agg.high_risk_count,
      },
      revenue: {
        live_mrr: liveMrr,
        rules_mrr_total: Math.round(agg.mrr_total * 100) / 100,
        consumer_mrr: Math.round(agg.consumer_mrr * 100) / 100,
        venue_mrr: Math.round(agg.venue_mrr * 100) / 100,
        mrr_at_risk: Math.round(agg.mrr_at_risk * 100) / 100,
        predicted_30d_loss: Math.round(agg.predicted_30d_loss * 100) / 100,
      },
      by_category: agg.by_category,
      lifecycle: agg.lifecycle,
      top_at_risk: topAtRisk,
      last_run: lastRun,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}