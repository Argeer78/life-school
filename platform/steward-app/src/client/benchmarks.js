const suiteList = document.querySelector("#suite-list");
const selectedTitle = document.querySelector("#selected-title");
const selectedDescription = document.querySelector("#selected-description");
const selectedCount = document.querySelector("#selected-count");
const runSelected = document.querySelector("#run-selected");
const runAll = document.querySelector("#run-all");
const developerMode = document.querySelector("#developer-mode");
const runStatus = document.querySelector("#run-status");
const results = document.querySelector("#results");

if (
  !(suiteList instanceof HTMLElement) ||
  !(selectedTitle instanceof HTMLElement) ||
  !(selectedDescription instanceof HTMLElement) ||
  !(selectedCount instanceof HTMLElement) ||
  !(runSelected instanceof HTMLButtonElement) ||
  !(runAll instanceof HTMLButtonElement) ||
  !(developerMode instanceof HTMLInputElement) ||
  !(runStatus instanceof HTMLElement) ||
  !(results instanceof HTMLElement)
) {
  throw new Error("Required Benchmark Runner element is missing.");
}

const suiteListView = /** @type {HTMLElement} */ (suiteList);
const selectedTitleView = /** @type {HTMLElement} */ (selectedTitle);
const selectedDescriptionView = /** @type {HTMLElement} */ (
  selectedDescription
);
const selectedCountView = /** @type {HTMLElement} */ (selectedCount);
const runSelectedButton = /** @type {HTMLButtonElement} */ (runSelected);
const runAllButton = /** @type {HTMLButtonElement} */ (runAll);
const developerModeInput = /** @type {HTMLInputElement} */ (developerMode);
const runStatusView = /** @type {HTMLElement} */ (runStatus);
const resultsView = /** @type {HTMLElement} */ (results);

/** @typedef {{id: string, title: string, description: string, totalConversations: number}} SetSummary */
/** @type {SetSummary[]} */
let suites = [];
/** @type {string | null} */
let selectedId = null;

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

/** @param {SetSummary} suite */
function selectSuite(suite) {
  selectedId = suite.id;
  selectedTitleView.textContent = `${suite.id} ${suite.title}`;
  selectedDescriptionView.textContent = suite.description;
  selectedCountView.textContent = `${suite.totalConversations} benchmark conversations`;
  suiteListView.querySelectorAll(".suite-button").forEach((button) => {
    button.setAttribute(
      "aria-selected",
      button.getAttribute("data-set-id") === selectedId ? "true" : "false",
    );
  });
}

function renderSuites() {
  suiteListView.replaceChildren();
  for (const suite of suites) {
    const button = document.createElement("button");
    const id = document.createElement("strong");
    const title = document.createElement("span");
    button.type = "button";
    button.className = "suite-button";
    button.setAttribute("role", "option");
    button.setAttribute("data-set-id", suite.id);
    id.textContent = suite.id;
    title.textContent = suite.title;
    button.append(id, title);
    button.addEventListener("click", () => selectSuite(suite));
    suiteListView.append(button);
  }
}

/** @param {unknown} value */
function responseText(value) {
  if (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return value.text;
  }
  return "No learner response recorded.";
}

/** @param {Record<string, unknown>} conversation */
function renderConversation(conversation) {
  const details = document.createElement("details");
  details.className = "conversation";
  const summary = document.createElement("summary");
  summary.textContent = String(conversation.id);
  const body = document.createElement("div");
  body.className = "conversation-body";

  /** @type {[string, string][]} */
  const responseFields = [
    ["Learner prompt", String(conversation.learnerPrompt)],
    ["Final response", responseText(conversation.finalResponse)],
  ];
  for (const [label, text] of responseFields) {
    const paragraph = document.createElement("p");
    const heading = document.createElement("span");
    paragraph.className = "field";
    heading.className = "field-label";
    heading.textContent = label;
    paragraph.append(heading, document.createTextNode(text));
    body.append(paragraph);
  }

  const trace = document.createElement("dl");
  trace.className = "trace-summary";
  const developerTrace =
    typeof conversation.developerTrace === "object" &&
    conversation.developerTrace !== null
      ? /** @type {Record<string, any>} */ (conversation.developerTrace)
      : null;
  const strategy = developerTrace?.strategySelection;
  const strategyText =
    strategy === undefined
      ? "Not exposed in learner-safe mode"
      : [
          `Primary: ${strategy.primary}`,
          `Secondary: ${strategy.secondary?.join(", ") || "none"}`,
        ].join(" / ");
  trace.append(
    definition("Strategy", strategyText),
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
    definition("Duration", `${String(conversation.durationMs)} ms`),
  );
  body.append(trace);

  const scoreTitle = document.createElement("span");
  scoreTitle.className = "field-label";
  scoreTitle.textContent = "Human scoring - manual placeholders";
  const scores = document.createElement("dl");
  scores.className = "manual-scores";
  for (const criterion of [
    "Constitutional Fidelity",
    "Human Dignity",
    "Human Freedom",
    "Intellectual Honesty",
    "Practical Helpfulness",
    "Naturalness",
    "PASS / FAIL",
    "Reviewer notes",
  ]) {
    scores.append(definition(criterion, "-"));
  }
  body.append(scoreTitle, scores);
  details.append(summary, body);
  return details;
}

/** @param {Record<string, any>} set */
function renderSet(set) {
  const section = document.createElement("section");
  section.className = "set-result";
  const title = document.createElement("h3");
  title.textContent = `${set.id} ${set.title}`;
  const summary = document.createElement("dl");
  summary.className = "set-summary";
  summary.append(
    definition("Total", String(set.conversations.length)),
    definition("Executed", String(set.conversations.length)),
    definition("Provider", String(set.provider)),
    definition("Model", String(set.model)),
    definition("Duration", `${String(set.durationMs)} ms`),
  );
  section.append(title, summary);
  for (const conversation of set.conversations) {
    section.append(renderConversation(conversation));
  }
  return section;
}

/** @param {"selected" | "all"} scope */
async function execute(scope) {
  if (scope === "selected" && selectedId === null) return;
  runSelectedButton.disabled = true;
  runAllButton.disabled = true;
  runStatusView.textContent =
    scope === "all"
      ? "Running all 72 conversations through the production pipeline..."
      : `Running ${selectedId} through the production pipeline...`;

  try {
    const request = {
      scope,
      developerMode: developerModeInput.checked,
      ...(scope === "selected" ? { setId: selectedId } : {}),
    };
    const response = await fetch("/api/benchmarks/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Benchmark request failed.");
    const result = await response.json();
    resultsView.replaceChildren(
      ...result.sets.map(
        /** @param {Record<string, any>} set */ (set) => renderSet(set),
      ),
    );
    runStatusView.textContent = `${result.sets.length} set(s) executed / ${result.status} pending human scoring`;
  } catch {
    resultsView.textContent =
      "The benchmark run could not complete. Check the local provider configuration.";
    runStatusView.textContent = "Run failed";
  } finally {
    runSelectedButton.disabled = false;
    runAllButton.disabled = false;
  }
}

runSelectedButton.addEventListener("click", () => void execute("selected"));
runAllButton.addEventListener("click", () => void execute("all"));

async function loadSuites() {
  try {
    const response = await fetch("/api/benchmarks");
    if (!response.ok) throw new Error("Fixture request failed.");
    const body = await response.json();
    suites = body.sets;
    renderSuites();
    const first = suites[0];
    if (first !== undefined) selectSuite(first);
    runSelectedButton.disabled = suites.length === 0;
    runAllButton.disabled = suites.length === 0;
    runStatusView.textContent = "Ready";
  } catch {
    suiteListView.textContent = "Canonical evaluation fixtures are unavailable.";
    selectedTitleView.textContent = "Unavailable";
    runStatusView.textContent = "Load failed";
  }
}

void loadSuites();
