/**
 * Featurebase integration — migrated to the official `featurebase-js` SDK.
 *
 * The messenger is booted by <FeaturebaseProvider> (mounted once at the app
 * root in App.jsx). Imperative control (show / hide / feedback / changelog)
 * runs through the `useFeaturebase()` hook, which is only available beneath
 * the Provider — so we bridge those methods into module scope via a small
 * registry that the Provider populates on mount. That keeps the existing
 * public helper API (openFeedback / openChangelog / openMessenger) working
 * for <FeaturebaseLauncher> and <FeaturebaseMenu> without changing them.
 */

/** Featurebase workspace App ID (24-char hex). */
export const FEATUREBASE_APP_ID = '6a941ff5eb370def49b163ff';

// Populated by FeaturebaseBridge (rendered inside the Provider) with the live
// messenger methods from useFeaturebase().
let messengerApi = null;

/** @internal — called by FeaturebaseBridge to wire up imperative methods. */
export function registerFeaturebaseApi(api) {
  messengerApi = api;
}

/** @internal — called on teardown / logout. */
export function unregisterFeaturebaseApi() {
  messengerApi = null;
}

/** Open the feedback composer (new message in the messenger). */
export function openFeedback() {
  messengerApi?.showNewMessage?.();
}

/** Open the Changelog / What's New space in the messenger. */
export function openChangelog() {
  messengerApi?.showChangelog?.();
}

/** Open the Support Messenger. */
export function openMessenger() {
  messengerApi?.show?.();
}

export const isFeaturebaseConfigured = () => Boolean(FEATUREBASE_APP_ID);