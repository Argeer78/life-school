import { projectLearnerResponse } from "./learner-response.js";
import { createMemoryTranscript } from "./learn-transcript.js";
import { initializeI18n } from "./i18n.js";

const i18n = await initializeI18n();

const transcriptElement = document.querySelector("#learn-transcript");
const form = document.querySelector("#learn-form");
const input = document.querySelector("#learn-message");
const sendButton = document.querySelector("#send-message");
const clearButton = document.querySelector("#clear-conversation");
const status = document.querySelector("#learn-status");

if (
  !(transcriptElement instanceof HTMLElement) ||
  !(form instanceof HTMLFormElement) ||
  !(input instanceof HTMLTextAreaElement) ||
  !(sendButton instanceof HTMLButtonElement) ||
  !(clearButton instanceof HTMLButtonElement) ||
  !(status instanceof HTMLElement)
) {
  throw new Error("Required learner interface element is missing.");
}

const transcriptView = /** @type {HTMLElement} */ (transcriptElement);
const formView = /** @type {HTMLFormElement} */ (form);
const inputView = /** @type {HTMLTextAreaElement} */ (input);
const sendButtonView = /** @type {HTMLButtonElement} */ (sendButton);
const clearButtonView = /** @type {HTMLButtonElement} */ (clearButton);
const statusView = /** @type {HTMLElement} */ (status);
const transcript = createMemoryTranscript();

function emptyState() {
  const container = document.createElement("div");
  const prompt = document.createElement("p");
  const privacy = document.createElement("span");
  container.className = "empty-state";
  prompt.textContent = i18n.translate("learn.emptyPrompt");
  privacy.textContent = i18n.translate("learn.emptyPrivacy");
  container.append(prompt, privacy);
  return container;
}

function render() {
  transcriptView.replaceChildren();
  const entries = transcript.entries();
  if (entries.length === 0) {
    transcriptView.append(emptyState());
    return;
  }

  for (const entry of entries) {
    const article = document.createElement("article");
    const label = document.createElement("span");
    const text = document.createElement("p");
    article.className = `message ${entry.role}`;
    label.className = "message-label";
    label.textContent =
      entry.role === "learner" ? i18n.translate("learn.you") : "Steward";
    text.className = "message-text";
    text.textContent = entry.text;
    article.append(label, text);
    transcriptView.append(article);
  }
  transcriptView.scrollTop = transcriptView.scrollHeight;
}

/** @param {string} key */
function setStatus(key) {
  statusView.dataset.i18n = key;
  statusView.textContent = i18n.translate(key);
}

formView.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = inputView.value.trim();
  if (message.length === 0) return;

  const requestVersion = transcript.version();
  transcript.add("learner", message);
  inputView.value = "";
  sendButtonView.disabled = true;
  setStatus("learn.responding");
  render();

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error("Learner request failed.");
    const learnerResponse = projectLearnerResponse(await response.json());
    if (requestVersion === transcript.version()) {
      transcript.add("steward", learnerResponse.text);
      setStatus("learn.responseComplete");
    }
  } catch {
    if (requestVersion === transcript.version()) {
      transcript.add(
        "steward",
        i18n.translate("learn.clientUnavailable"),
      );
      setStatus("learn.responseUnavailable");
    }
  } finally {
    sendButtonView.disabled = false;
    render();
    inputView.focus();
  }
});

clearButtonView.addEventListener("click", () => {
  transcript.clear();
  setStatus("learn.conversationCleared");
  render();
  inputView.focus();
});

window.addEventListener("lifeschool:locale-change", render);
