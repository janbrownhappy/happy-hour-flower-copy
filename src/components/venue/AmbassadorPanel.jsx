import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { partneroAmbassador } from '@/functions/partneroAmbassador';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, CheckCheck, ExternalLink, Users, Loader2, Gift, Download, Printer, TrendingUp, RefreshCw, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AmbassadorPanel({ venue, user, onVenueUpdate }) {
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState(null);
  const { toast } = useToast();

  // Auto-load stats when partner ID is available
  useEffect(() => {
    if (!venue?.partnero_partner_id) return;
    loadStats(venue.partnero_partner_id);
  }, [venue?.partnero_partner_id]);

  const hasReferralLink = !!venue?.partnero_referral_link;

  const handleActivate = async () => {
    setLoading(true);
    try {
      const res = await partneroAmbassador({
        action: 'create_partner',
        venueId: venue.id,
        partnerEmail: user.email,
        partnerName: user.full_name?.split(' ')[0] || '',
        partnerSurname: user.full_name?.split(' ').slice(1).join(' ') || '',
      });

      if (res.data?.error) throw new Error(res.data.error);

      const { partner_id, referral_link } = res.data;

      if (!referral_link) {
        throw new Error('Your referral link could not be retrieved. Please try again in a moment.');
      }

      await base44.entities.Venue.update(venue.id, {
        partnero_partner_id: partner_id,
        partnero_referral_link: referral_link,
      });

      onVenueUpdate({ ...venue, partnero_partner_id: partner_id, partnero_referral_link: referral_link });

      toast({ title: res.data.already_existed ? 'Ambassador link retrieved!' : 'Ambassador program activated! 🎉', description: 'Your referral link is ready to share.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (partnerId) => {
    const pid = partnerId ?? venue?.partnero_partner_id;
    if (!pid) return;
    setStatsLoading(true);
    try {
      const res = await partneroAmbassador({
        action: 'get_stats',
        partnerId: pid,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setStats(res.data);
    } catch (err) {
      // silently fail on auto-load; user can manually refresh
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(venue.partnero_referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = venue?.partnero_referral_link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(venue.partnero_referral_link)}&bgcolor=ffffff&color=b45309&margin=20`
    : null;

  const handleDownloadQR = async () => {
    const response = await fetch(qrUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${venue.name?.replace(/\s+/g, '-') || 'venue'}-referral-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintQR = () => {
    const venueName = venue.name || 'Our Venue';
    const referralLink = venue.partnero_referral_link;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${venueName} - Referral QR Code</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Georgia, serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { border: 3px solid #b45309; border-radius: 16px; padding: 40px 48px; text-align: center; max-width: 420px; width: 100%; }
            .logo-line { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #b45309; font-weight: bold; margin-bottom: 8px; }
            .venue-name { font-size: 28px; font-weight: bold; color: #1a1a1a; margin-bottom: 6px; line-height: 1.2; }
            .tagline { font-size: 14px; color: #6b7280; margin-bottom: 28px; }
            .qr-img { width: 220px; height: 220px; border-radius: 12px; border: 2px solid #fde68a; margin: 0 auto 24px; display: block; }
            .cta { font-size: 15px; color: #374151; margin-bottom: 8px; font-weight: 600; }
            .link { font-size: 11px; color: #b45309; word-break: break-all; }
            .divider { border: none; border-top: 1px solid #fde68a; margin: 20px 0; }
            .footer { font-size: 11px; color: #9ca3af; }
            @media print { body { min-height: 100%; } .card { border-color: #b45309; } }
          </style>
        </head>
        <body>
          <div class="card">
            <p class="logo-line">Happy Hour Flower</p>
            <h1 class="venue-name">Follow ${venueName}</h1>
            <p class="tagline">Love our happy hours? Download the app &amp; follow us!</p>
            <img class="qr-img" src="${qrUrl}" alt="Follow QR Code" />
            <p class="cta">📱 Scan to download the app &amp; follow us</p>
            <hr class="divider" />
            <p class="link">${referralLink}</p>
            <hr class="divider" />
            <p class="footer">Display this QR at the bar, on tables, or on receipts!</p>
          </div>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-foreground">Grow Your Following</h3>
          <p className="text-xs text-muted-foreground">Get customers to follow you on the app</p>
        </div>
        {hasReferralLink && (
          <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">Active</Badge>
        )}
      </div>

      {!hasReferralLink ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Get your own shareable link and QR code so customers can download Happy Hour Flower and follow your venue for deals and updates.
          </p>
          <Button onClick={handleActivate} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</> : <><Share2 className="w-4 h-4 mr-2" /> Get My Follow Link</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Your Follow Link</p>
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-sm text-foreground flex-1 truncate font-mono">{venue.partnero_referral_link}</p>
              <button onClick={handleCopy} className="flex-shrink-0 text-amber-600 hover:text-amber-700 transition-colors">
                {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a href={venue.partnero_referral_link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-amber-600 hover:text-amber-700 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* QR Code */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow QR Code</p>
            </div>
            <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 text-center space-y-4">
              {/* QR preview card */}
              <div className="inline-block border-2 border-amber-200 rounded-xl p-3 bg-white shadow-sm">
                <img
                  src={qrUrl}
                  alt="Follow QR Code"
                  className="w-44 h-44 rounded-lg block"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{venue.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Scan to download the app & follow us for deals!</p>
              </div>
              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleDownloadQR} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                  <Download className="w-4 h-4 mr-1.5" /> Download PNG
                </Button>
                <Button onClick={handlePrintQR} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
                  <Printer className="w-4 h-4 mr-1.5" /> Print Card
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Print this card and display it at your venue so customers can scan, download the app, and follow you for deals.
              </p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follower Performance</p>
              <button onClick={() => loadStats(venue.partnero_partner_id)} disabled={statsLoading} className="text-amber-600 hover:text-amber-700 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {statsLoading && !stats ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading stats...</span>
              </div>
            ) : stats ? (
              <div className="space-y-3">
                {/* Metric cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.customers_count ?? stats.referrals_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Followers</p>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.clicks ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Link Clicks</p>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.referrals_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sign-ups</p>
                  </div>
                </div>

                {/* Sign-ups list */}
                {stats.customers?.length > 0 && (
                  <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New followers from your link</p>
                    </div>
                    <div className="divide-y divide-amber-50 max-h-48 overflow-y-auto">
                      {stats.customers.map((c, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                          </div>
                          <div className="text-right">
                            {c.created_at && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                            <Badge className={`text-xs capitalize ${c.status === 'active' ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-600 border-0'}`}>
                              {c.status || 'active'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.customers?.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-3">No followers yet — start sharing your link!</p>
                )}
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => loadStats(venue.partnero_partner_id)} disabled={statsLoading} className="w-full border-amber-200 text-amber-700 hover:bg-amber-50">
                <TrendingUp className="w-4 h-4 mr-2" /> Load Performance Stats
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}