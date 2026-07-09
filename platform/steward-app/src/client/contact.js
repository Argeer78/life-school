const formElement = document.querySelector("#contact-form");
const statusElement = document.querySelector("#contact-status");
const submitElement = document.querySelector("#contact-submit");
const startedAt = Date.now();

if (
  !(formElement instanceof HTMLFormElement) ||
  !(statusElement instanceof HTMLElement) ||
  !(submitElement instanceof HTMLButtonElement)
) {
  throw new Error("Contact form is unavailable.");
}

const form = formElement;
const statusView = statusElement;
const submitButton = submitElement;

/** @param {string} message @param {"muted" | "success" | "error"} [tone] */
function setStatus(message, tone = "muted") {
  statusView.textContent = message;
  statusView.dataset.tone = tone;
}

/** @param {boolean} isLoading */
function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Sending..." : "Send message";
}

/** @param {FormData} formData @param {string} key */
function textValue(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** @param {string} value */
function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** @param {FormData} formData */
function validate(formData) {
  const name = textValue(formData, "name");
  const email = textValue(formData, "email");
  const subject = textValue(formData, "subject");
  const category = textValue(formData, "category");
  const message = textValue(formData, "message");

  if (name.length === 0) return "Name is required.";
  if (!validEmail(email)) return "A valid email is required.";
  if (subject.length === 0) return "Subject is required.";
  if (category.length === 0) return "Category is required.";
  if (message.length < 10) return "Message should be at least 10 characters.";
  return null;
}

/** @param {{
 * name: string,
 * email: string,
 * subject: string,
 * category: string,
 * message: string,
 * startedAt: number,
 * }} payload */
async function submitContact(payload) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "object" &&
      result.error !== null &&
      "code" in result.error &&
      typeof result.error.code === "string"
        ? result.error.code
        : "REQUEST_FAILED";
    throw new Error(code);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const invalid = validate(formData);
  if (invalid !== null) {
    setStatus(invalid, "error");
    return;
  }

  const payload = {
    name: textValue(formData, "name"),
    email: textValue(formData, "email"),
    subject: textValue(formData, "subject"),
    category: textValue(formData, "category"),
    message: textValue(formData, "message"),
    startedAt,
  };

  setLoading(true);
  setStatus("Sending your message...", "muted");
  void submitContact(payload)
    .then(() => {
      form.reset();
      setStatus("Message sent successfully. We will respond via contact@alphasynthai.com.", "success");
    })
    .catch((error) => {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        setStatus("Too many requests. Please wait a few minutes and try again.", "error");
        return;
      }
      if (error instanceof Error && error.message === "SPAM_DETECTED") {
        setStatus("Please wait a moment and try again.", "error");
        return;
      }
      if (error instanceof Error && error.message === "INVALID_COMMUNICATION_REQUEST") {
        setStatus("Please review your form fields and try again.", "error");
        return;
      }
      setStatus("Message delivery failed. Please try again shortly.", "error");
    })
    .finally(() => {
      setLoading(false);
    });
});
