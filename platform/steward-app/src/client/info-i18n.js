import { initializeI18n } from "./i18n.js";

const i18n = await initializeI18n();

function updateTitle() {
  const key = document.body.dataset.titleKey;
  if (!key) return;
  document.title = i18n.translate(key);
}

updateTitle();
window.addEventListener("lifeschool:locale-change", updateTitle);
