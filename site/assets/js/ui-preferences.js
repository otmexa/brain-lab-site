const STORAGE_KEYS = {
  theme: "brain-lab-theme",
  readingMode: "brain-lab-reading-mode",
};

const THEME_VALUES = new Set(["light", "dark"]);
const READING_VALUES = new Set(["default", "focused"]);

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getTheme = () => {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  return THEME_VALUES.has(storedTheme) ? storedTheme : getSystemTheme();
};

const getReadingMode = () => {
  const storedMode = localStorage.getItem(STORAGE_KEYS.readingMode);
  return READING_VALUES.has(storedMode) ? storedMode : "default";
};

const applyTheme = (theme) => {
  const nextTheme = THEME_VALUES.has(theme) ? theme : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.body.dataset.theme = nextTheme;
};

const applyReadingMode = (mode) => {
  const nextMode = READING_VALUES.has(mode) ? mode : "default";
  document.body.dataset.readingMode = nextMode;
};

const syncControls = () => {
  const currentTheme = document.documentElement.dataset.theme || "light";
  const currentReadingMode = document.body.dataset.readingMode || "default";

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const isActive = button.dataset.themeChoice === currentTheme;
    button.dataset.active = String(isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.querySelectorAll("[data-reading-choice]").forEach((button) => {
    const isActive = button.dataset.readingChoice === currentReadingMode;
    button.dataset.active = String(isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const updateTheme = (theme) => {
  applyTheme(theme);
  localStorage.setItem(STORAGE_KEYS.theme, document.documentElement.dataset.theme);
  syncControls();
};

const updateReadingMode = (mode) => {
  applyReadingMode(mode);
  localStorage.setItem(STORAGE_KEYS.readingMode, document.body.dataset.readingMode);
  syncControls();
};

const initUiPreferences = () => {
  applyTheme(getTheme());
  applyReadingMode(getReadingMode());
  syncControls();

  document.addEventListener("click", (event) => {
    const themeButton = event.target.closest("[data-theme-choice]");
    const readingButton = event.target.closest("[data-reading-choice]");

    if (themeButton) {
      updateTheme(themeButton.dataset.themeChoice);
    }

    if (readingButton) {
      updateReadingMode(readingButton.dataset.readingChoice);
    }
  });
};

initUiPreferences();
