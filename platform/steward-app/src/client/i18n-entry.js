import { initializeI18n } from "./i18n.js";

const i18n = await initializeI18n();

function updateDocumentTitle() {
  document.title = i18n.translate("courses.documentTitle");
}

updateDocumentTitle();
window.addEventListener("lifeschool:locale-change", updateDocumentTitle);
