/**
 * PHASE 2 FEATURE TOGGLES
 * ------------------------
 * Geofencing and Beacons are being held back for a Phase 2 release.
 * All of their code stays in place — it's simply hidden from the UI until
 * these flags are flipped on.
 *
 * When you're ready to launch these features (in a month or two), set the
 * relevant flag to `true` below. Everything re-appears instantly — no other
 * code changes needed.
 */

export const PHASE2 = {
  geofencing: true,
  beacons: true,
};

/** Convenience: true only when BOTH proximity features are hidden. */
export const proximityHidden = !PHASE2.geofencing && !PHASE2.beacons;