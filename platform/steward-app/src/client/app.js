import { projectLearnerResponse } from "./learner-response.js";

const transcriptElement = document.querySelector("#transcript");
const form = document.querySelector("#message-form");
const input = document.querySelector("#message");
const sendButton = document.querySelector("#send");
const clearButton = document.querySelector("#clear");

if (
  !(transcriptElement instanceof HTMLElement) ||
  !(form instanceof HTMLFormElement) ||
  !(input instanceof HTMLTextAreaElement) ||
  !(sendButton instanceof HTMLButtonElement) ||
  !(clearButton instanceof HTMLButtonElement)
) {
  throw new Error("Required interface element is missing.");
}

const transcriptView = transcriptElement;

/** @type {{role: "user" | "steward", text: string}[]} */
const transcript = [];

function render() {
  transcriptView.replaceChildren();

  if (transcript.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No messages yet.";
    transcriptView.append(empty);
    return;
  }

  for (const entry of transcript) {
    const article = document.createElement("article");
    article.className = `message ${entry.role}`;

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = entry.role === "user" ? "You" : "Steward";

    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = entry.text;

    article.append(label, text);
    transcriptView.append(article);
  }

  transcriptView.scrollTop = transcriptView.scrollHeight;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (message.length === 0) return;

  transcript.push({ role: "user", text: message });
  input.value = "";
  sendButton.disabled = true;
  render();

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) throw new Error("Request failed.");
    const learnerResponse = projectLearnerResponse(await response.json());
    transcript.push({ role: "steward", text: learnerResponse.text });
  } catch {
    transcript.push({
      role: "steward",
      text: "I’m not able to respond reliably right now. You may try again or stop here.",
    });
  } finally {
    sendButton.disabled = false;
    render();
    input.focus();
  }
});

clearButton.addEventListener("click", () => {
  transcript.splice(0, transcript.length);
  render();
  input.focus();
});
