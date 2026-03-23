(function () {
  const THEME_KEY = "heroThemeMode";

  function getThemeMode() {
    try {
      return window.localStorage.getItem(THEME_KEY) === "science-bright"
        ? "science-bright"
        : "classic";
    } catch {
      return "classic";
    }
  }

  const themeMode = getThemeMode();
  document.documentElement.dataset.theme = themeMode;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body) {
      document.body.dataset.theme = themeMode;
    }
  });
}());
