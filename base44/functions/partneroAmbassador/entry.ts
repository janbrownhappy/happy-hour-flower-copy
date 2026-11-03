import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PARTNERO_API = 'https://api.partnero.com/v1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('PARTNERO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Partnero API key not configured' }, { status: 500 });
    }

    const { action, venueId, partnerEmail, partnerName, partnerSurname, partnerId } = await req.json();

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Create a new partner (ambassador) in Partnero
    if (action === 'create_partner') {
      // Check if partner already exists by trying to get them
      const existingRes = await fetch(`${PARTNERO_API}/partners?limit=1&page=1`, { headers });
      
      // Create partner
      const createRes = await fetch(`${PARTNERO_API}/partners`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: partnerEmail,
          name: partnerName || '',
          surname: partnerSurname || '',
          key: `venue-${venueId}`.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 50),
          tags: ['venue-ambassador'],
        }),
      });

      const createData = await createRes.json();

      // If email already exists, fetch the existing partner
      if (!createRes.ok && createData.errors?.email) {
        const searchRes = await fetch(`${PARTNERO_API}/partners`, { headers });
        const searchData = await searchRes.json();
        const existing = (searchData.data || []).find(p => p.email === partnerEmail);
        if (existing) {
          // The list endpoint often omits referral_link; fetch the full partner detail to get it.
          let referralLink = existing.referral_link;
          if (!referralLink) {
            const detailRes = await fetch(`${PARTNERO_API}/partners/${encodeURIComponent(existing.id)}`, { headers });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              referralLink = detailData.data?.referral_link;
            }
          }
          return Response.json({
            partner_id: existing.id,
            referral_link: referralLink,
            already_existed: true,
          });
        }
        return Response.json({ error: createData.message || 'Failed to create partner' }, { status: 422 });
      }

      if (!createRes.ok) {
        return Response.json({ error: createData.message || 'Failed to create partner' }, { status: createRes.status });
      }

      return Response.json({
        partner_id: createData.data.id,
        referral_link: createData.data.referral_link,
        already_existed: false,
      });
    }

    // Get partner details by ID or email
    if (action === 'get_partner') {
      const identifier = partnerId || partnerEmail;
      const res = await fetch(`${PARTNERO_API}/partners/${encodeURIComponent(identifier)}`, { headers });
      const data = await res.json();

      if (!res.ok) {
        return Response.json({ error: data.message || 'Partner not found' }, { status: res.status });
      }

      return Response.json({
        partner_id: data.data.id,
        referral_link: data.data.referral_link,
        referrals_count: data.data.referrals_count,
        status: data.data.status,
      });
    }

    // Get partner stats (referrals count + customers)
    if (action === 'get_stats') {
      const [partnerRes, customersRes] = await Promise.all([
        fetch(`${PARTNERO_API}/partners/${encodeURIComponent(partnerId)}`, { headers }),
        fetch(`${PARTNERO_API}/partners/${encodeURIComponent(partnerId)}/customers?limit=100`, { headers }),
      ]);

      const partnerData = await partnerRes.json();

      if (!partnerRes.ok) {
        return Response.json({ error: partnerData.message || 'Partner not found' }, { status: partnerRes.status });
      }

      let customers = [];
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        customers = (customersData.data || []).map(c => ({
          name: c.name || c.email || 'Unknown',
          email: c.email,
          created_at: c.created_at,
          status: c.status,
        }));
      }

      const partner = partnerData.data;
      return Response.json({
        referrals_count: partner.referrals_count || 0,
        customers_count: customers.length,
        status: partner.status,
        referral_link: partner.referral_link,
        earnings: partner.earnings || 0,
        clicks: partner.clicks || 0,
        customers,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});