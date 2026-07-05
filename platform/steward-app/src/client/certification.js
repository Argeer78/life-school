const suiteCount = document.querySelector("#suite-count");
const suiteList = document.querySelector("#suite-list");
const runButton = document.querySelector("#run-certification");
const developerMode = document.querySelector("#developer-mode");
const summary = document.querySelector("#certification-summary");
const runStatus = document.querySelector("#run-status");
const results = document.querySelector("#certification-results");

if (
  !(suiteCount instanceof HTMLElement) ||
  !(suiteList instanceof HTMLElement) ||
  !(runButton instanceof HTMLButtonElement) ||
  !(developerMode instanceof HTMLInputElement) ||
  !(summary instanceof HTMLDListElement) ||
  !(runStatus instanceof HTMLElement) ||
  !(results instanceof HTMLElement)
) {
  throw new Error("Required Certification Dashboard element is missing.");
}

const suiteCountView = /** @type {HTMLElement} */ (suiteCount);
const suiteListView = /** @type {HTMLElement} */ (suiteList);
const runCertificationButton = /** @type {HTMLButtonElement} */ (runButton);
const developerModeInput = /** @type {HTMLInputElement} */ (developerMode);
const summaryView = /** @type {HTMLDListElement} */ (summary);
const runStatusView = /** @type {HTMLElement} */ (runStatus);
const resultsView = /** @type {HTMLElement} */ (results);

/** @typedef {{id: string, title: string, totalConversations: number}} SetSummary */
/** @type {SetSummary[]} */
let suites = [];

/** @param {string} name @param {string} value */
function definition(name, value) {
  const container = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = name;
  description.textContent = value;
  container.append(term, description);
  return container;
}

/** @param {{provider: string, model: string, durationMs: number, status: string, sets: Record<string, any>[]}} result */
function renderCertificationSummary(result) {
  const executed = result.sets.reduce(
    (total, set) => total + set.conversations.length,
    0,
  );
  summaryView.replaceChildren(
    definition("Total sets", String(suites.length)),
    definition(
      "Total conversations",
      String(
        suites.reduce(
          (total, suite) => total + suite.totalConversations,
          0,
        ),
      ),
    ),
    definition("Executed conversations", String(executed)),
    definition("Provider", result.provider),
    definition("Model", result.model),
    definition("Duration", `${result.durationMs} ms`),
    definition(
      "Scoring status",
      `${result.status} / HUMAN REVIEW REQUIRED`,
    ),
  );
}

function renderInitialSummary() {
  const conversationTotal = suites.reduce(
    (total, suite) => total + suite.totalConversations,
    0,
  );
  summaryView.replaceChildren(
    definition("Total sets", String(suites.length)),
    definition("Total conversations", String(conversationTotal)),
    definition("Executed conversations", "0"),
    definition("Provider", "-"),
    definition("Model", "-"),
    definition("Duration", "-"),
    definition("Scoring status", "HUMAN REVIEW REQUIRED"),
  );
}

function renderSuiteCatalog() {
  suiteListView.replaceChildren();
  for (const suite of suites) {
    const item = document.createElement("div");
    const id = document.createElement("strong");
    const title = document.createElement("span");
    item.className = "suite-chip";
    item.setAttribute("data-set-id", suite.id);
    id.textContent = suite.id;
    title.textContent = `${suite.title} / ${suite.totalConversations} conversations`;
    item.append(id, title);
    suiteListView.append(item);
  }
}

/** @param {unknown} response */
function learnerResponseText(response) {
  if (
    typeof response === "object" &&
    response !== null &&
    "text" in response &&
    typeof response.text === "string"
  ) {
    return response.text;
  }
  return "No learner response recorded.";
}

/** @param {Record<string, any>} conversation */
function renderConversation(conversation) {
  const details = document.createElement("details");
  details.className = "conversation";
  const heading = document.createElement("summary");
  heading.textContent = String(conversation.id);
  const body = document.createElement("div");
  body.className = "conversation-body";

  /** @type {[string, string][]} */
  const fields = [
    ["Learner prompt", String(conversation.learnerPrompt)],
    ["Final response", learnerResponseText(conversation.finalResponse)],
  ];
  for (const [label, value] of fields) {
    const field = document.createElement("p");
    const fieldLabel = document.createElement("span");
    field.className = "field";
    fieldLabel.className = "field-label";
    fieldLabel.textContent = label;
    field.append(fieldLabel, document.createTextNode(value));
    body.append(field);
  }

  const trace = document.createElement("dl");
  trace.className = "trace-summary";
  const developerTrace =
    typeof conversation.developerTrace === "object" &&
    conversation.developerTrace !== null
      ? conversation.developerTrace
      : null;
  const strategy = developerTrace?.strategySelection;
  trace.append(
    definition(
      "Strategy",
      strategy === undefined
        ? "Not exposed in learner-safe mode"
        : `Primary: ${strategy.primary} / Secondary: ${
            strategy.secondary?.join(", ") || "none"
          }`,
    ),
    definition(
      "Review",
      developerTrace?.reviewResult ?? "Not exposed in learner-safe mode",
    ),
    definition(
      "Fallback",
      developerTrace === null
        ? "Not exposed in learner-safe mode"
        : developerTrace.fallback.used
          ? `Used: ${developerTrace.fallback.category}`
          : "Not used",
    ),
  );
  body.append(trace);
  details.append(heading, body);
  return details;
}

/** @param {Record<string, any>} set */
function renderSet(set) {
  const section = document.createElement("section");
  section.className = "set-result";
  const heading = document.createElement("h3");
  const metadata = document.createElement("dl");
  metadata.className = "set-summary";
  heading.textContent = `${set.id} ${set.title}`;
  metadata.append(
    definition("Conversations executed", String(set.conversations.length)),
    definition("Execution status", "COMPLETE"),
    definition("Duration", `${set.durationMs} ms`),
    definition("Scoring status", String(set.status)),
  );
  metadata.querySelectorAll("dd")[1]?.classList.add("execution-status");
  section.append(heading, metadata);
  for (const conversation of set.conversations) {
    section.append(renderConversation(conversation));
  }
  return section;
}

async function runCertification() {
  runCertificationButton.disabled = true;
  runStatusView.textContent =
    "Executing all 72 conversations through the production pipeline...";

  try {
    const response = await fetch("/api/benchmarks/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "all",
        developerMode: developerModeInput.checked,
      }),
    });
    if (!response.ok) throw new Error("Certification request failed.");
    const result = await response.json();
    renderCertificationSummary(result);
    resultsView.replaceChildren(
      ...result.sets.map(
        /** @param {Record<string, any>} set */ (set) => renderSet(set),
      ),
    );
    runStatusView.textContent =
      "Execution complete. Human scoring is required under EVAL-000.";
  } catch {
    resultsView.textContent =
      "Certification execution could not complete. Check the local provider configuration.";
    runStatusView.textContent = "Execution failed";
  } finally {
    runCertificationButton.disabled = false;
  }
}

runCertificationButton.addEventListener(
  "click",
  () => void runCertification(),
);

async function loadCertification() {
  try {
    const response = await fetch("/api/benchmarks");
    if (!response.ok) throw new Error("Fixture request failed.");
    const body = await response.json();
    suites = body.sets;
    renderSuiteCatalog();
    renderInitialSummary();
    const total = suites.reduce(
      (count, suite) => count + suite.totalConversations,
      0,
    );
    suiteCountView.textContent = `${suites.length} evaluation sets / ${total} benchmark conversations`;
    runCertificationButton.disabled = suites.length !== 12 || total !== 72;
    runStatusView.textContent = "Ready";
  } catch {
    suiteListView.textContent = "Canonical evaluation fixtures are unavailable.";
    suiteCountView.textContent = "Unavailable";
    runStatusView.textContent = "Load failed";
  }
}

void loadCertification();
