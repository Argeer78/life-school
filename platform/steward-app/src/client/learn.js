import { projectLearnerResponse } from "./learner-response.js";
import { createMemoryTranscript } from "./learn-transcript.js";

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
  prompt.textContent = "What would you like to examine?";
  privacy.textContent = "Your conversation stays only in this browser tab.";
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
    label.textContent = entry.role === "learner" ? "You" : "Steward";
    text.className = "message-text";
    text.textContent = entry.text;
    article.append(label, text);
    transcriptView.append(article);
  }
  transcriptView.scrollTop = transcriptView.scrollHeight;
}

formView.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = inputView.value.trim();
  if (message.length === 0) return;

  const requestVersion = transcript.version();
  transcript.add("learner", message);
  inputView.value = "";
  sendButtonView.disabled = true;
  statusView.textContent = "Steward is responding...";
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
      statusView.textContent = "Response complete.";
    }
  } catch {
    if (requestVersion === transcript.version()) {
      transcript.add(
        "steward",
        "I am not able to respond reliably right now. You may try again or stop here.",
      );
      statusView.textContent = "Response unavailable.";
    }
  } finally {
    sendButtonView.disabled = false;
    render();
    inputView.focus();
  }
});

clearButtonView.addEventListener("click", () => {
  transcript.clear();
  statusView.textContent = "Conversation cleared.";
  render();
  inputView.focus();
});
