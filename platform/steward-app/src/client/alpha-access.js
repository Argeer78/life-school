const proofKey = "lifeschool.alphaAccessProof";
const form = document.querySelector("#alpha-access-form");
const codeInput = document.querySelector("#alpha-access-code");
const errorView = document.querySelector("#alpha-access-error");

if (
  !(form instanceof HTMLFormElement) ||
  !(codeInput instanceof HTMLInputElement) ||
  !(errorView instanceof HTMLElement)
) {
  throw new Error("Alpha access interface is unavailable.");
}

/**
 * @param {{code?: string, proof?: string}} credentials
 */
async function requestAccess(credentials) {
  const response = await fetch("/api/alpha-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...credentials, path: window.location.pathname }),
  });
  const result = await response.json();
  if (
    !response.ok ||
    typeof result !== "object" ||
    result === null ||
    result.granted !== true ||
    typeof result.proof !== "string" ||
    typeof result.html !== "string"
  ) {
    throw new Error("ALPHA_ACCESS_DENIED");
  }
  return result;
}

/** @param {{proof: string, html: string}} result */
function enterLifeschool(result) {
  window.sessionStorage.setItem(proofKey, result.proof);
  document.open();
  document.write(result.html);
  document.close();
}

async function restoreSessionAccess() {
  const proof = window.sessionStorage.getItem(proofKey);
  if (proof === null) return;
  try {
    enterLifeschool(await requestAccess({ proof }));
  } catch {
    window.sessionStorage.removeItem(proofKey);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorView.textContent = "";
  void requestAccess({ code: codeInput.value })
    .then(enterLifeschool)
    .catch(() => {
      errorView.textContent = "That access code is not correct.";
      codeInput.select();
    });
});

void restoreSessionAccess();
