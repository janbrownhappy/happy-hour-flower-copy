import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Paginated, filterable, sortable at-risk queue. Filters by risk_category and/or entity_type
// so the browser never loads all accounts. Admin-only.
// Payload: { risk_category?, entity_type?, sort?, page?, page_size? }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const riskCategory = body.risk_category || null;
    const entityType = body.entity_type || null;
    const sort = body.sort || '-churn_score';
    const page = Math.max(1, parseInt(body.page) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(body.page_size) || 25));

    const query = {};
    if (riskCategory && riskCategory !== 'all') query.risk_category = riskCategory;
    if (entityType && entityType !== 'all') query.entity_type = entityType;

    // Fetch matching rows (bounded), then paginate in-function so we can return an accurate total.
    const all = await base44.asServiceRole.entities.RetentionProfile.filter(query, sort, 5000).catch(() => []);
    const total = all.length;
    const start = (page - 1) * pageSize;
    const rows = all.slice(start, start + pageSize).map(r => ({
      id: r.id,
      entity_type: r.entity_type,
      account_ref_id: r.account_ref_id,
      display_name: r.display_name,
      email: r.email,
      subscription_tier: r.subscription_tier,
      is_paid: r.is_paid,
      mrr: r.mrr,
      churn_score: r.churn_score,
      score_change: r.score_change,
      risk_category: r.risk_category,
      primary_risk_reason: r.primary_risk_reason,
      conversion_score: r.conversion_score,
      lifecycle_status: r.lifecycle_status,
      revenue_at_risk: r.revenue_at_risk,
      last_scored_at: r.last_scored_at,
    }));

    return Response.json({ success: true, total, page, page_size: pageSize, rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}