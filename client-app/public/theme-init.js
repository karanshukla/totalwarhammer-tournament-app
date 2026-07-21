(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.classList.add(theme);
  } catch {
    // localStorage/matchMedia may be unavailable (private mode, SSR); the
    // inline theme flash is best-effort, so swallow the error.
  }
})();
