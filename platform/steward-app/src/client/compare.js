import { compareTraceJson } from "./trace-comparison.js";

const form = document.querySelector("#compare-form");
const traceA = document.querySelector("#trace-a");
const traceB = document.querySelector("#trace-b");
const traceAError = document.querySelector("#trace-a-error");
const traceBError = document.querySelector("#trace-b-error");
const status = document.querySelector("#compare-status");
const summary = document.querySelector("#comparison-summary");
const results = document.querySelector("#section-results");

if (
  !(form instanceof HTMLFormElement) ||
  !(traceA instanceof HTMLTextAreaElement) ||
  !(traceB instanceof HTMLTextAreaElement) ||
  !(traceAError instanceof HTMLElement) ||
  !(traceBError instanceof HTMLElement) ||
  !(status instanceof HTMLElement) ||
  !(summary instanceof HTMLElement) ||
  !(results instanceof HTMLElement)
) {
  throw new Error("Required Trace Comparison element is missing.");
}

const formView = /** @type {HTMLFormElement} */ (form);
const traceAView = /** @type {HTMLTextAreaElement} */ (traceA);
const traceBView = /** @type {HTMLTextAreaElement} */ (traceB);
const traceAErrorView = /** @type {HTMLElement} */ (traceAError);
const traceBErrorView = /** @type {HTMLElement} */ (traceBError);
const statusView = /** @type {HTMLElement} */ (status);
const summaryView = /** @type {HTMLElement} */ (summary);
const resultsView = /** @type {HTMLElement} */ (results);

/** @param {unknown} value */
function formatJson(value) {
  return value === undefined ? "(field missing)" : JSON.stringify(value, null, 2);
}

/** @param {string} side @param {unknown} value */
function rawPanel(side, value) {
  const details = document.createElement("details");
  const heading = document.createElement("summary");
  const output = document.createElement("pre");
  heading.textContent = `Raw ${side} JSON`;
  output.textContent = formatJson(value);
  details.append(heading, output);
  return details;
}

/** @param {{label: string, status: "same" | "changed", summary: string, valueA: unknown, valueB: unknown}} section */
function renderSection(section) {
  const article = document.createElement("article");
  const headingRow = document.createElement("div");
  const headingText = document.createElement("div");
  const heading = document.createElement("h3");
  const detail = document.createElement("p");
  const state = document.createElement("span");
  const raw = document.createElement("div");

  article.className = `comparison-section ${section.status}`;
  headingRow.className = "comparison-header";
  state.className = "comparison-state";
  raw.className = "raw-sides";
  heading.textContent = section.label;
  detail.textContent = section.summary;
  state.textContent = section.status;
  headingText.append(heading, detail);
  headingRow.append(headingText, state);
  raw.append(
    rawPanel("Trace A", section.valueA),
    rawPanel("Trace B", section.valueB),
  );
  article.append(headingRow, raw);
  return article;
}

function clearErrors() {
  traceAErrorView.textContent = "";
  traceBErrorView.textContent = "";
  traceAView.removeAttribute("aria-invalid");
  traceBView.removeAttribute("aria-invalid");
}

/** @param {"INVALID_JSON" | "INVALID_TRACE_ROOT" | null} code */
function errorMessage(code) {
  if (code === "INVALID_JSON") return "Invalid JSON.";
  if (code === "INVALID_TRACE_ROOT") {
    return "Trace must be a JSON object.";
  }
  return "";
}

formView.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();
  const comparison = compareTraceJson(traceAView.value, traceBView.value);

  if (!comparison.ok) {
    traceAErrorView.textContent = errorMessage(comparison.errors.traceA);
    traceBErrorView.textContent = errorMessage(comparison.errors.traceB);
    if (comparison.errors.traceA !== null) {
      traceAView.setAttribute("aria-invalid", "true");
    }
    if (comparison.errors.traceB !== null) {
      traceBView.setAttribute("aria-invalid", "true");
    }
    resultsView.replaceChildren();
    summaryView.textContent =
      "Comparison was not run. Correct the invalid trace input.";
    statusView.textContent = "Invalid trace JSON";
    return;
  }

  resultsView.replaceChildren(
    ...comparison.sections.map((section) => renderSection(section)),
  );
  summaryView.textContent =
    comparison.changedSectionCount === 0
      ? "The selected trace sections contain no field differences."
      : `${comparison.changedSectionCount} of ${comparison.sections.length} sections changed.`;
  statusView.textContent = "Comparison complete";
});
