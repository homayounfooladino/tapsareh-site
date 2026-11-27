// A page kept from an older build can ask for build files that a newer install no longer has.
// Then the fix is one real reload (the page itself is always re-checked by the server). Once per tab, so it never loops.
const KEY = "tp-reloaded";

export function isStaleBuildError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  const text = `${e?.name || ""} ${e?.message || ""}`;
  return /chunk|dynamically imported module|module script|Loading CSS/i.test(text);
}

export function reloadOnceForStaleBuild(error: unknown): boolean {
  if (!isStaleBuildError(error)) return false;
  try {
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export function clearReloadMark(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}
