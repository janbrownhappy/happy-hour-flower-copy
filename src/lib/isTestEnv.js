// True in the builder preview (iframe) or an automated browser — used to skip
// popups/animations that get in the way of automated testing. Live visitors are unaffected.
export default function isTestEnv() {
  try {
    return navigator.webdriver || window.self !== window.top;
  } catch {
    return true;
  }
}