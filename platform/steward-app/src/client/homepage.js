import { initializeI18n } from "./i18n.js";
import { createShareLinks } from "./share-actions.js";

const i18n = await initializeI18n();
const homeShareText = "Lifeschool helps people think clearly, understand themselves, and live intentionally.";
const homeShareLabels = {
  copy: "Copy Link",
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "Email",
};

function updateDocumentTitle() {
  document.title = i18n.translate("home.documentTitle");
}

function configureHomeSharing() {
  const shareRoot = document.querySelector("[data-share-root]");
  if (!(shareRoot instanceof HTMLElement)) return;

  const url = `${window.location.origin}${window.location.pathname}`;
  const text = homeShareText;
  const links = createShareLinks(url, text);

  const copyButton = shareRoot.querySelector("[data-share-copy]");
  if (copyButton instanceof HTMLButtonElement) {
    copyButton.textContent = homeShareLabels.copy;
  }

  for (const anchor of shareRoot.querySelectorAll("[data-share-link]")) {
    if (!(anchor instanceof HTMLAnchorElement)) continue;
    const key = anchor.dataset.shareLink;
    if (key === undefined) continue;
    if (key in homeShareLabels) {
      anchor.textContent = homeShareLabels[/** @type {keyof typeof homeShareLabels} */ (key)];
    }
    const href = links[/** @type {keyof typeof links} */ (key)];
    if (typeof href === "string") {
      anchor.href = href;
    }
  }

  const status = document.querySelector("[data-share-status]");
  if (!(copyButton instanceof HTMLButtonElement)) return;
  copyButton.dataset.shareUrl = url;

  if (copyButton.dataset.boundCopy === "1") return;
  copyButton.dataset.boundCopy = "1";
  copyButton.addEventListener("click", async () => {
    const value = copyButton.dataset.shareUrl ?? url;
    if (!(status instanceof HTMLElement)) return;
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = i18n.translate("share.linkCopied");
    } catch {
      status.textContent = i18n.translate("share.copyUnavailable");
    }
  });
}

updateDocumentTitle();
configureHomeSharing();
window.addEventListener("lifeschool:locale-change", () => {
  updateDocumentTitle();
  configureHomeSharing();
});
