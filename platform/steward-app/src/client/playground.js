import { serializePlaygroundTrace } from "./playground-trace.js";

const form = document.querySelector("#playground-form");
const input = document.querySelector("#learner-input");
const runButton = document.querySelector("#run-steward");
const runStatus = document.querySelector("#run-status");
const finalResponse = document.querySelector("#final-response");
const metadata = document.querySelector("#metadata");
const copyButton = document.querySelector("#copy-trace");

const stageElements = {
  strategySelection: document.querySelector("#stage-strategy"),
  behaviorPlanAndGenerationRequest: document.querySelector(
    "#stage-plan-request",
  ),
  providerResponse: document.querySelector("#stage-provider-response"),
  providerValidation: document.querySelector("#stage-validation"),
  constitutionalReview: document.querySelector("#stage-review"),
  revision: document.querySelector("#stage-revision"),
  fallback: document.querySelector("#stage-fallback"),
};

if (
  !(form instanceof HTMLFormElement) ||
  !(input instanceof HTMLTextAreaElement) ||
  !(runButton instanceof HTMLButtonElement) ||
  !(runStatus instanceof HTMLElement) ||
  !(finalResponse instanceof HTMLElement) ||
  !(metadata instanceof HTMLDListElement) ||
  !(copyButton instanceof HTMLButtonElement) ||
  Object.values(stageElements).some(
    (element) => !(element instanceof HTMLPreElement),
  )
) {
  throw new Error("Required Playground element is missing.");
}

const metadataView = /** @type {HTMLDListElement} */ (metadata);
const finalResponseView = /** @type {HTMLElement} */ (finalResponse);
const copyTraceButton = /** @type {HTMLButtonElement} */ (copyButton);
/** @type {Parameters<typeof serializePlaygroundTrace>[0] | null} */
let latestResult = null;

/** @param {unknown} value */
function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

/** @param {string} text */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    if (!copied) throw new Error("Clipboard unavailable.");
  }
}

/**
 * @param {{
 *   provider: string,
 *   model: string,
 *   durationMs: number,
 *   revisionCount: number,
 *   fallbackStatus: string,
 *   reviewResult: string | null,
 *   tokenCounts: {input: number, output: number, total: number} | null
 * }} value
 */
function renderMetadata(value) {
  const tokens =
    value.tokenCounts === null
      ? "Unavailable"
      : `${value.tokenCounts.input} in / ${value.tokenCounts.output} out / ${value.tokenCounts.total} total`;
  /** @type {[string, string][]} */
  const entries = [
    ["Provider", value.provider],
    ["Model", value.model],
    ["Duration", `${value.durationMs} ms`],
    ["Revisions", String(value.revisionCount)],
    ["Fallback", value.fallbackStatus],
    ["Review", value.reviewResult ?? "Not reached"],
    ["Tokens", tokens],
  ];

  metadataView.replaceChildren();
  for (const [label, text] of entries) {
    const container = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = text;
    container.append(term, description);
    metadataView.append(container);
  }
}

/**
 * @param {{
 *   learnerResponse: {text: string},
 *   metadata: Parameters<typeof renderMetadata>[0],
 *   stages: Record<string, unknown>
 * }} result
 */
function renderResult(result) {
  finalResponseView.textContent = result.learnerResponse.text;
  renderMetadata(result.metadata);
  /** @type {Record<string, unknown>} */
  const stageValues = {
    strategySelection: result.stages.strategySelection,
    behaviorPlanAndGenerationRequest: {
      behaviorPlan: result.stages.behaviorPlanning,
      generationRequest: result.stages.providerRequest,
    },
    providerResponse: result.stages.providerResponse,
    providerValidation: result.stages.providerValidation,
    constitutionalReview: result.stages.constitutionalReview,
    revision: result.stages.revision,
    fallback: result.stages.fallback,
  };

  for (const [stage, element] of Object.entries(stageElements)) {
    const output = /** @type {HTMLPreElement} */ (element);
    output.textContent = formatJson(stageValues[stage]);
  }
  latestResult = result;
  copyTraceButton.disabled = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (message.length === 0) return;

  runButton.disabled = true;
  runStatus.textContent = "Running production pipeline...";

  try {
    const response = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) throw new Error("Playground request failed.");
    renderResult(await response.json());
    runStatus.textContent = "Complete";
  } catch {
    finalResponseView.textContent =
      "The Playground could not complete this run. Check the local server configuration.";
    runStatus.textContent = "Failed";
  } finally {
    runButton.disabled = false;
    input.focus();
  }
});

copyTraceButton.addEventListener("click", async () => {
  if (latestResult === null) return;

  try {
    await copyText(serializePlaygroundTrace(latestResult));
    runStatus.textContent = "Trace JSON copied";
  } catch {
    runStatus.textContent = "Copy failed";
  }
});
