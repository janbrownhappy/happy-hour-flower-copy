import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Smartphone, Apple, Rocket, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'appstore_launch_checklist_v1';

// Items pre-checked because they are already shipped in the app.
const DEFAULT_DONE = ['m_bottom_sheets', 'm_tap_targets', 'm_back_nav', 'm_pull_refresh', 'm_tab_reset', 'm_transitions', 'm_safe_area', 'm_touch_inputs'];

const SECTIONS = [
  {
    title: 'Mobile Readiness (In-App — Done)',
    icon: Sparkles,
    items: [
      { id: 'm_bottom_sheets', label: 'Dropdowns appear as bottom sheets on mobile', detail: 'Select & menu popovers slide up from the bottom of the screen on small viewports.' },
      { id: 'm_tap_targets', label: 'Global 44×44px minimum tap targets', detail: 'All buttons and links meet the accessibility/mobile minimum touch-target size.' },
      { id: 'm_back_nav', label: 'Back button on child routes', detail: 'Header shows the brand logo on root tabs and a functional Back button on detail/child pages.' },
      { id: 'm_pull_refresh', label: 'Pull-to-refresh on Explore', detail: 'Native-style pull-down gesture refreshes venue, news, and event data.' },
      { id: 'm_tab_reset', label: 'Re-tap active tab scrolls to top', detail: 'Tapping the already-active bottom-nav tab smooth-scrolls that tab back to the top.' },
      { id: 'm_transitions', label: 'Slide transitions between pages', detail: 'Non-tab pages animate with a subtle horizontal slide for a native feel.' },
      { id: 'm_safe_area', label: 'Safe-area insets respected', detail: 'Header and bottom nav pad for notches and home indicators.' },
      { id: 'm_touch_inputs', label: 'Touch-friendly form inputs', detail: 'Venue dashboard and event editor fields use comfortable 44px input heights.' },
    ],
  },
  {
    title: 'Shared Assets (Both Stores)',
    icon: Rocket,
    items: [
      { id: 'app_name', label: 'Final app name', detail: 'The public name shown on both stores. Must be unique and under 30 characters.' },
      { id: 'app_icon', label: 'App icon — 1024×1024 px PNG', detail: 'Square, no transparency, no rounded corners. Stores apply their own masking.' },
      { id: 'short_desc', label: 'Short description / subtitle', detail: 'One-line hook. Apple: 30-char subtitle. Google: 80-char short description.' },
      { id: 'full_desc', label: 'Full description (up to ~4000 chars)', detail: 'Explain what the app does, key features, and who it is for.' },
      { id: 'keywords', label: 'Keywords / search terms', detail: 'Apple: 100-char comma list. Google pulls keywords from your description.' },
      { id: 'privacy_url', label: 'Privacy Policy URL (live & public)', detail: 'Required by both stores. You already have /privacy in the app.' },
      { id: 'support_url', label: 'Support URL & support email', detail: 'A page or email where users can get help. Required at submission.' },
      { id: 'category', label: 'Primary & secondary category', detail: 'e.g. Food & Drink / Lifestyle. Pick the closest fit.' },
      { id: 'age_rating', label: 'Content / age rating questionnaire', detail: 'Alcohol-related content (happy hours) may push the rating to 17+ / Mature.' },
    ],
  },
  {
    title: 'Screenshots & Media',
    icon: Smartphone,
    items: [
      { id: 'ios_6_7', label: 'iPhone 6.7" screenshots (1290×2796)', detail: 'At least 3, up to 10. Required for the latest large iPhones.' },
      { id: 'ios_6_5', label: 'iPhone 6.5" screenshots (1242×2688)', detail: 'Recommended fallback set for older devices.' },
      { id: 'ipad_shots', label: 'iPad screenshots (if supporting iPad)', detail: '12.9" display — 2048×2732. Skip if iPhone-only.' },
      { id: 'android_phone', label: 'Android phone screenshots', detail: 'At least 2, min 320px, max 3840px on the longest side. 16:9 or 9:16.' },
      { id: 'feature_graphic', label: 'Google feature graphic (1024×500)', detail: 'Banner shown at the top of your Play Store listing. Required.' },
      { id: 'promo_video', label: 'Promo / preview video (optional)', detail: 'App preview on Apple, YouTube link on Google. Boosts conversion.' },
    ],
  },
  {
    title: 'Apple App Store',
    icon: Apple,
    items: [
      { id: 'apple_dev', label: 'Apple Developer Program enrollment ($99/yr)', detail: 'Individual or organization account at developer.apple.com.' },
      { id: 'bundle_id', label: 'Bundle ID registered', detail: 'Reverse-domain identifier, e.g. com.happyhourflower.app.' },
      { id: 'app_store_connect', label: 'App created in App Store Connect', detail: 'Create the listing record before uploading a build.' },
      { id: 'ios_build', label: 'Signed iOS build uploaded (TestFlight)', detail: 'Archive and upload via Xcode/Transporter, then test in TestFlight.' },
      { id: 'apple_privacy', label: 'App Privacy "nutrition label" filled', detail: 'Declare what data you collect (location, email, etc.) and how it is used.' },
      { id: 'export_compliance', label: 'Export compliance answered', detail: 'Encryption usage question during submission. Usually "uses standard encryption".' },
      { id: 'review_notes', label: 'Demo account + review notes', detail: 'Provide a test login so Apple reviewers can access gated features.' },
    ],
  },
  {
    title: 'Google Play Store',
    icon: Smartphone,
    items: [
      { id: 'google_dev', label: 'Google Play Console account ($25 one-time)', detail: 'Register at play.google.com/console.' },
      { id: 'package_name', label: 'Package name set', detail: 'e.g. com.happyhourflower.app — cannot be changed after publishing.' },
      { id: 'android_build', label: 'Signed Android App Bundle (.aab) uploaded', detail: 'Google requires .aab, not .apk, for new apps.' },
      { id: 'data_safety', label: 'Data Safety form completed', detail: 'Equivalent to Apple privacy labels — declare data collection & sharing.' },
      { id: 'content_rating', label: 'Content rating questionnaire submitted', detail: 'IARC questionnaire — note alcohol-related content.' },
      { id: 'target_audience', label: 'Target audience & ads declaration', detail: 'Confirm intended age groups and whether the app contains ads.' },
      { id: 'testing_track', label: 'Internal/closed testing track run', detail: 'Google now requires testing before production for new personal accounts.' },
    ],
  },
];

const TOTAL = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

export default function AppStoreLaunchChecklist() {
  const [checked, setChecked] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const base = Object.fromEntries(DEFAULT_DONE.map(id => [id, true]));
      setChecked(saved ? { ...base, ...JSON.parse(saved) } : base);
    } catch { /* ignore */ }
  }, []);

  const toggle = (id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((doneCount / TOTAL) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" /> App Store Launch Checklist
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to prepare before submitting to the Apple App Store and Google Play. Your progress is saved automatically.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{doneCount} of {TOTAL} steps complete</span>
          <span className="text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {SECTIONS.map(section => {
        const Icon = section.icon;
        const sectionDone = section.items.filter(i => checked[i.id]).length;
        return (
          <div key={section.title} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <h3 className="font-heading font-bold flex items-center gap-2 text-foreground">
                <Icon className="w-4 h-4 text-primary" /> {section.title}
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">{sectionDone}/{section.items.length}</span>
            </div>
            <ul className="divide-y divide-border">
              {section.items.map(item => {
                const isChecked = !!checked[item.id];
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    >
                      {isChecked
                        ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        : <Circle className="w-5 h-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />}
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-semibold ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.label}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{item.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}