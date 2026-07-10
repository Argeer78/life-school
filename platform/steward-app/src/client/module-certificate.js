/**
 * @typedef {{
 *   learnerName: string,
 *   moduleTitle: string,
 *   moduleSlug: string,
 *   completionDate: Date,
 *   certificateId: string
 * }} ModuleCertificate
 */

/** @param {string} value */
function escapePdfText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll(/[^\x20-\x7E]/g, " ");
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @param {string} value */
function sanitizeFilename(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9-]+/g, "-").replaceAll(/^-+|-+$/g, "");
}

/** @param {Date} value */
function isoDay(value) {
  return value.toISOString().slice(0, 10);
}

/** @param {string} value */
function stableDigest(value) {
  let hash = 2166136261;
  for (const ch of value) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}`.padStart(10, "0").slice(0, 8).toUpperCase();
}

/**
 * @param {string} moduleSlug
 * @param {Date} completionDate
 * @param {string} learnerName
 */
export function createCertificateId(moduleSlug, completionDate, learnerName = "") {
  const compactDate = isoDay(completionDate).replaceAll("-", "");
  const moduleCode = sanitizeFilename(moduleSlug).toUpperCase().slice(0, 10) || "MODULE";
  const digest = stableDigest(`${moduleSlug}|${completionDate.toISOString()}|${learnerName.trim()}`);
  return `LS-${moduleCode}-${compactDate}-${digest}`;
}

/** @param {Date} completionDate */
export function formatCompletionDate(completionDate) {
  return isoDay(completionDate);
}

/** @param {ModuleCertificate} certificate */
export function certificateShareText(certificate) {
  return [
    "Lifeschool Module Completion Certificate",
    `Module: ${certificate.moduleTitle}`,
    `Completion Date: ${formatCompletionDate(certificate.completionDate)}`,
    `Certificate ID: ${certificate.certificateId}`,
  ].join("\n");
}

/** @param {ModuleCertificate} certificate */
export function createCertificatePdf(certificate) {
  const lines = [
    "Lifeschool",
    "Module Completion Certificate",
    "",
    `Learner: ${certificate.learnerName.trim() || "Not provided"}`,
    `Module: ${certificate.moduleTitle}`,
    `Completion Date: ${formatCompletionDate(certificate.completionDate)}`,
    `Certificate ID: ${certificate.certificateId}`,
    "",
    "This certifies completion of the Lifeschool module listed above.",
    "",
    "AlphaSynth AI",
  ].map(escapePdfText);

  const content = [
    "BT",
    "/F1 28 Tf",
    "72 760 Td",
    `(${lines[0]}) Tj`,
    "/F1 18 Tf",
    "0 -34 Td",
    `(${lines[1]}) Tj`,
    "/F1 12 Tf",
    "0 -52 Td",
    `(${lines[3]}) Tj`,
    "0 -22 Td",
    `(${lines[4]}) Tj`,
    "0 -22 Td",
    `(${lines[5]}) Tj`,
    "0 -22 Td",
    `(${lines[6]}) Tj`,
    "0 -42 Td",
    `(${lines[8]}) Tj`,
    "0 -96 Td",
    `(${lines[10]}) Tj`,
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  let position = (chunks[0] ?? "").length;
  for (const object of objects) {
    offsets.push(position);
    chunks.push(object);
    position += object.length;
  }

  const xrefStart = position;
  const xrefRows = ["xref\n0 6\n0000000000 65535 f \n"];
  for (let index = 1; index <= 5; index += 1) {
    xrefRows.push(`${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(xrefRows.join(""));
  chunks.push("trailer\n<< /Size 6 /Root 1 0 R >>\n");
  chunks.push(`startxref\n${xrefStart}\n%%EOF`);

  return new TextEncoder().encode(chunks.join(""));
}

/** @param {ModuleCertificate} certificate */
export function downloadCertificatePdf(certificate) {
  const pdfBytes = createCertificatePdf(certificate);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const fileSlug = sanitizeFilename(certificate.moduleSlug) || "module";
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = `lifeschool-certificate-${fileSlug}-${certificate.certificateId}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

/** @param {ModuleCertificate} certificate */
export function printCertificate(certificate) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=920,height=760");
  if (printWindow === null) {
    throw new Error("Print window is unavailable.");
  }

  const learnerName = escapeHtml(certificate.learnerName.trim() || "Not provided");
  const moduleTitle = escapeHtml(certificate.moduleTitle);
  const certificateId = escapeHtml(certificate.certificateId);
  const completionDate = escapeHtml(formatCompletionDate(certificate.completionDate));
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Lifeschool Certificate</title>
<style>
  body { font-family: "Alegreya", Georgia, serif; color: #0f172a; margin: 0; background: #f8fafc; }
  .sheet { width: min(900px, calc(100% - 2rem)); margin: 2rem auto; background: #fff; border: 2px solid #1e3a8a; border-radius: 14px; padding: 2.25rem; }
  .brand { font-size: 2rem; margin: 0; color: #1e3a8a; }
  .title { margin: 0.35rem 0 1.6rem; font-size: 1.5rem; }
  dl { display: grid; grid-template-columns: minmax(140px, 180px) 1fr; gap: 0.55rem 1rem; margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; }
  dt { font-weight: 700; color: #1e3a8a; }
  dd { margin: 0; }
  .statement { margin-top: 1.5rem; font-family: "Manrope", "Segoe UI", sans-serif; }
  .footer { margin-top: 2.2rem; padding-top: 0.9rem; border-top: 1px solid #dbe4f5; color: #334155; font-family: "Manrope", "Segoe UI", sans-serif; }
  @media print {
    body { background: #fff; }
    .sheet { width: auto; margin: 0; border-radius: 0; box-shadow: none; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <main class="sheet" aria-label="Module completion certificate">
    <h1 class="brand">Lifeschool</h1>
    <p class="title">Module Completion Certificate</p>
    <dl>
      <dt>Learner</dt>
      <dd>${learnerName}</dd>
      <dt>Module</dt>
      <dd>${moduleTitle}</dd>
      <dt>Completion Date</dt>
      <dd>${completionDate}</dd>
      <dt>Certificate ID</dt>
      <dd>${certificateId}</dd>
    </dl>
    <p class="statement">This certifies completion of the Lifeschool module listed above.</p>
    <p class="footer">AlphaSynth AI</p>
  </main>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/** @param {ModuleCertificate} certificate */
export async function shareCertificate(certificate) {
  const text = certificateShareText(certificate);
  if (typeof navigator.share === "function") {
    await navigator.share({
      title: "Lifeschool Module Completion Certificate",
      text,
    });
    return;
  }

  if (navigator.clipboard?.writeText !== undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error("Sharing is unavailable.");
}
