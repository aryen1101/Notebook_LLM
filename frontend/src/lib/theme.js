// Browser-chrome colours; keep in sync with --paper in index.css and the
// <meta name="theme-color"> tags / pre-paint script in index.html.
const CHROME = { light: "#F7F6F2", dark: "#17161B" };

/** Apply "system" | "light" | "dark" to <html> and the mobile browser bar. */
export function applyTheme(theme) {
  const root = document.documentElement;
  const forced = theme === "light" || theme === "dark";

  if (forced) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");

  // Each meta targets one OS scheme via its media attribute. With a forced
  // theme both get the forced colour; on "system" each gets its own back.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const scheme = /dark/.test(meta.media) ? "dark" : "light";
    meta.content = CHROME[forced ? theme : scheme];
  });
}
