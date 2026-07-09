import { readFile } from "node:fs/promises";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { GenerationProvider } from "../provider/contract.js";
import {
  configuredProviderMode,
  createConfiguredGenerationProvider,
} from "../provider/openai/config.js";
import { defaultOpenAIModel } from "../provider/openai/adapter.js";
import { loadEvaluationFixtures } from "../evaluation/fixtures.js";
import type { EvaluationRuntime } from "../evaluation/types.js";
import { createLocalDemoFakeModel } from "./local-demo-model.js";
import {
  benchmarkSetSummaries,
  InvalidBenchmarkRequest,
  parseBenchmarkRunRequest,
  processBenchmarkRun,
} from "./benchmark-api.js";
import {
  InvalidMessageRequest,
  learnerResponseBody,
  maximumMessageLength,
  processLearnerMessage,
} from "./message-api.js";
import { processPlaygroundMessage } from "./playground-api.js";
import {
  CommunicationDeliveryFailed,
  CommunicationRateLimiter,
  InvalidCommunicationRequest,
  parseContactSubmission,
  parseFeedbackSubmission,
  processContactSubmission,
  processFeedbackSubmission,
} from "./communication-api.js";
import {
  createContactMailTransport,
  type ContactMailTransport,
} from "./contact-mail.js";

const host = "127.0.0.1";
const defaultPort = 4173;
const clientDirectory = join(dirname(fileURLToPath(import.meta.url)), "../client");
const publicOrigin = "https://lifesh.app";

interface StaticAsset {
  readonly file: string;
  readonly contentType: string;
}

const staticFiles = new Map<string, StaticAsset>([
  ["/", { file: "index.html", contentType: "text/html; charset=utf-8" }],
  ["/about", { file: "about.html", contentType: "text/html; charset=utf-8" }],
  [
    "/about/",
    { file: "about.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/privacy",
    { file: "privacy.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/privacy/",
    { file: "privacy.html", contentType: "text/html; charset=utf-8" },
  ],
  ["/terms", { file: "terms.html", contentType: "text/html; charset=utf-8" }],
  [
    "/terms/",
    { file: "terms.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/contact",
    { file: "contact.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/contact/",
    { file: "contact.html", contentType: "text/html; charset=utf-8" },
  ],
  ["/styles.css", { file: "styles.css", contentType: "text/css; charset=utf-8" }],
  [
    "/manifest.webmanifest",
    { file: "manifest.webmanifest", contentType: "application/manifest+json; charset=utf-8" },
  ],
  ["/sw.js", { file: "sw.js", contentType: "text/javascript; charset=utf-8" }],
  [
    "/offline.html",
    { file: "offline.html", contentType: "text/html; charset=utf-8" },
  ],
  ["/robots.txt", { file: "robots.txt", contentType: "text/plain; charset=utf-8" }],
  ["/favicon.svg", { file: "favicon.svg", contentType: "image/svg+xml" }],
  [
    "/sitemap.xml",
    { file: "sitemap.xml", contentType: "application/xml; charset=utf-8" },
  ],
  ["/pwa/icon-192.png", { file: "pwa/icon-192.png", contentType: "image/png" }],
  ["/pwa/icon-512.png", { file: "pwa/icon-512.png", contentType: "image/png" }],
  [
    "/pwa/icon-maskable-512.png",
    { file: "pwa/icon-maskable-512.png", contentType: "image/png" },
  ],
  [
    "/pwa/apple-touch-icon-180.png",
    { file: "pwa/apple-touch-icon-180.png", contentType: "image/png" },
  ],
  [
    "/pwa/apple-splash-2048x2732.png",
    { file: "pwa/apple-splash-2048x2732.png", contentType: "image/png" },
  ],
  ["/og-image.svg", { file: "og-image.svg", contentType: "image/svg+xml" }],
  ["/theme.js", { file: "theme.js", contentType: "text/javascript; charset=utf-8" }],
  ["/contact.js", { file: "contact.js", contentType: "text/javascript; charset=utf-8" }],
  [
    "/lifeschool-logo.svg",
    { file: "lifeschool-logo.svg", contentType: "image/svg+xml" },
  ],
  [
    "/learner-nav.css",
    { file: "learner-nav.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/homepage.js",
    { file: "homepage.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/share-actions.js",
    { file: "share-actions.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/alpha-access.js",
    { file: "alpha-access.js", contentType: "text/javascript; charset=utf-8" },
  ],
  ["/app.js", { file: "app.js", contentType: "text/javascript; charset=utf-8" }],
  [
    "/learner-response.js",
    { file: "learner-response.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/i18n.js",
    { file: "i18n.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/i18n-entry.js",
    { file: "i18n-entry.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/info-i18n.js",
    { file: "info-i18n.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/i18n/locales/en.json",
    {
      file: "../i18n/locales/en.json",
      contentType: "application/json; charset=utf-8",
    },
  ],
  [
    "/i18n/locales/el.json",
    {
      file: "../i18n/locales/el.json",
      contentType: "application/json; charset=utf-8",
    },
  ],
  [
    "/playground",
    { file: "playground.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/playground/",
    { file: "playground.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/playground.css",
    { file: "playground.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/playground.js",
    { file: "playground.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/playground-trace.js",
    {
      file: "playground-trace.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/benchmarks",
    { file: "benchmarks.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/benchmarks/",
    { file: "benchmarks.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/benchmarks.css",
    { file: "benchmarks.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/benchmarks.js",
    { file: "benchmarks.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/certification",
    { file: "certification.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/certification/",
    { file: "certification.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/certification.css",
    { file: "certification.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/certification.js",
    { file: "certification.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/compare",
    { file: "compare.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/compare/",
    { file: "compare.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/compare.css",
    { file: "compare.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/compare.js",
    { file: "compare.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/trace-comparison.js",
    {
      file: "trace-comparison.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/devtools",
    { file: "devtools.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/devtools/",
    { file: "devtools.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/devtools.css",
    { file: "devtools.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/learn",
    { file: "learn.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/learn/",
    { file: "learn.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/learn.css",
    { file: "learn.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/learn.js",
    { file: "learn.js", contentType: "text/javascript; charset=utf-8" },
  ],
  [
    "/learn-transcript.js",
    {
      file: "learn-transcript.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/courses",
    { file: "courses.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/courses/",
    { file: "courses.html", contentType: "text/html; charset=utf-8" },
  ],
  [
    "/courses/thinking-clearly",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/thinking-clearly/",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/communicating-clearly",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/communicating-clearly/",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/making-decisions",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/making-decisions/",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/understanding-emotions",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/understanding-emotions/",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/relationships",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/relationships/",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/purpose-meaning",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses/purpose-meaning/",
    {
      file: "lesson.html",
      contentType: "text/html; charset=utf-8",
    },
  ],
  [
    "/courses.css",
    { file: "courses.css", contentType: "text/css; charset=utf-8" },
  ],
  [
    "/lesson-page.js",
    {
      file: "lesson-page.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/lesson-model.js",
    {
      file: "lesson-model.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/course-session.js",
    {
      file: "course-session.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/lesson-renderer.js",
    {
      file: "lesson-renderer.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/thinking-clearly-lessons.js",
    {
      file: "thinking-clearly-lessons.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/thinking-clearly-lessons-el.js",
    {
      file: "thinking-clearly-lessons-el.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/additional-modules-lessons.js",
    {
      file: "additional-modules-lessons.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/additional-modules-lessons-el.js",
    {
      file: "additional-modules-lessons-el.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/curriculum-lessons.js",
    {
      file: "curriculum-lessons.js",
      contentType: "text/javascript; charset=utf-8",
    },
  ],
]);

const lessonAsset: StaticAsset = {
  file: "lesson.html",
  contentType: "text/html; charset=utf-8",
};

const curriculumModuleSlugs = [
  "thinking-clearly",
  "communicating-clearly",
  "making-decisions",
  "understanding-emotions",
  "relationships",
  "purpose-meaning",
] as const;

function isCurriculumLessonPath(pathname: string): boolean {
  return curriculumModuleSlugs.some((slug) =>
    new RegExp(`^/courses/${slug}/lesson-[1-6]/?$`).test(pathname),
  );
}

function isCurriculumModuleRoot(pathname: string): boolean {
  return curriculumModuleSlugs.some(
    (slug) => pathname === `/courses/${slug}` || pathname === `/courses/${slug}/`,
  );
}

function learnerPageAsset(pathname: string): StaticAsset | undefined {
  if (
    pathname === "/" ||
    pathname === "/learn" ||
    pathname === "/learn/" ||
    pathname === "/courses" ||
    pathname === "/courses/" ||
    isCurriculumModuleRoot(pathname)
  ) {
    return staticFiles.get(pathname);
  }
  return isCurriculumLessonPath(pathname) ? lessonAsset : undefined;
}

function isAlphaProtectedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/learn" ||
    pathname === "/learn/" ||
    pathname === "/courses" ||
    pathname === "/courses/" ||
    isCurriculumModuleRoot(pathname) ||
    curriculumModuleSlugs.some((slug) => pathname.startsWith(`/courses/${slug}/`))
  );
}

function alphaProof(accessCode: string): string {
  return createHmac("sha256", accessCode)
    .update("lifeschool-private-alpha")
    .digest("hex");
}

function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function securityHeaders(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

function escapeMeta(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface SocialMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
}

function moduleNameForSlug(slug: string): string {
  switch (slug) {
    case "thinking-clearly":
      return "Thinking Clearly";
    case "communicating-clearly":
      return "Communicating Clearly";
    case "making-decisions":
      return "Making Decisions";
    case "understanding-emotions":
      return "Understanding Emotions";
    case "relationships":
      return "Relationships";
    case "purpose-meaning":
      return "Purpose & Meaning";
    default:
      return "Lifeschool";
  }
}

function metadataForLessonPath(pathname: string): SocialMetadata | undefined {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const moduleMatch = normalizedPath.match(/^\/courses\/([a-z-]+)$/);
  if (moduleMatch !== null) {
    const slug = moduleMatch[1] ?? "";
    const moduleName = moduleNameForSlug(slug);
    return {
      title: `${moduleName} | Lifeschool`,
      description: `Explore the ${moduleName} module in Lifeschool and start learning one lesson at a time.`,
      canonical: `${publicOrigin}${normalizedPath}`,
    };
  }

  const lessonMatch = normalizedPath.match(/^\/courses\/([a-z-]+)\/lesson-([1-6])$/);
  if (lessonMatch !== null) {
    const slug = lessonMatch[1] ?? "";
    const lessonNumber = Number(lessonMatch[2] ?? "1");
    const moduleName = moduleNameForSlug(slug);
    return {
      title: `${moduleName} - Lesson ${lessonNumber} | Lifeschool`,
      description: `Lesson ${lessonNumber} of ${moduleName} in Lifeschool. Practice clear thinking with guided learning and reflection.`,
      canonical: `${publicOrigin}${normalizedPath}`,
    };
  }

  return undefined;
}

function withLessonMetadata(html: string, pathname: string): string {
  const metadata = metadataForLessonPath(pathname);
  if (metadata === undefined) return html;
  const title = escapeMeta(metadata.title);
  const description = escapeMeta(metadata.description);
  const canonical = escapeMeta(metadata.canonical);
  const image = `${publicOrigin}/og-image.svg`;
  return html
    .replaceAll("__META_TITLE__", title)
    .replaceAll("__META_DESCRIPTION__", description)
    .replaceAll("__META_CANONICAL__", canonical)
    .replaceAll("__META_IMAGE__", escapeMeta(image));
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  securityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

async function sendClientAsset(
  response: ServerResponse,
  asset: StaticAsset,
  status = 200,
  revealAlphaNote = false,
  pathname = "/",
): Promise<void> {
  const content = await readFile(join(clientDirectory, asset.file));
  let body = content;
  if (asset.file === "lesson.html") {
    body = Buffer.from(withLessonMetadata(content.toString("utf8"), pathname), "utf8");
  }
  if (revealAlphaNote && asset.file === "index.html") {
    body = Buffer.from(
      body.toString("utf8").replace(" data-alpha-note hidden", " data-alpha-note"),
      "utf8",
    );
  }
  securityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", asset.contentType);
  response.end(body);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  const maxRequestBodyLength = Math.max(maximumMessageLength + 1_000, 25_000);

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maxRequestBodyLength) {
      throw new InvalidMessageRequest();
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new InvalidMessageRequest();
  }
}

export interface LocalStewardServerOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly generationProvider?: GenerationProvider | null;
  readonly contactMailTransport?: ContactMailTransport;
  readonly communicationRateLimit?: {
    readonly maxRequests: number;
    readonly windowMs: number;
  };
}

export function createLocalStewardServer(
  options: LocalStewardServerOptions = {},
) {
  const environment = options.environment ?? process.env;
  const alphaAccessCode = environment.ALPHA_ACCESS_CODE?.trim() ?? "";
  const alphaAccessEnabled = alphaAccessCode.length > 0;
  const configuredProviderInOptions = "generationProvider" in options;
  const resolvedProviderMode = configuredProviderInOptions
    ? options.generationProvider === null
      ? "fake"
      : "injected"
    : configuredProviderMode(environment);
  const configuredProvider =
    configuredProviderInOptions
      ? (options.generationProvider ?? null)
      : resolvedProviderMode === "openai"
        ? createConfiguredGenerationProvider(environment)
        : null;
  const providerMode = resolvedProviderMode;
  const providerModel =
    providerMode === "openai"
      ? environment.OPENAI_MODEL?.trim() || defaultOpenAIModel
      : providerMode === "fake"
        ? "local-demo"
        : "configured-provider";
  const mailTransport =
    options.contactMailTransport ?? createContactMailTransport(environment);
  const communicationRateLimiter = new CommunicationRateLimiter(
    options.communicationRateLimit ?? { maxRequests: 5, windowMs: 10 * 60 * 1000 },
  );

  console.info("[server:provider:boot]", {
    providerMode,
    providerModel,
    configuredProviderInjected: configuredProviderInOptions,
    stewardProviderRaw: environment.STEWARD_PROVIDER?.trim() || "",
    openAIModelRaw: environment.OPENAI_MODEL?.trim() || "",
    hasOpenAIApiKey: Boolean(environment.OPENAI_API_KEY?.trim()),
  });

  const evaluationRuntime: EvaluationRuntime = {
    provider: providerMode,
    model: providerModel,
    createModel: (conversation) =>
      createLocalDemoFakeModel(
        conversation.learnerPrompt,
        configuredProvider,
      ),
  };
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/alpha-access") {
      try {
        const body = await readJson(request);
        const record =
          typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : {};
        const pathname =
          typeof record.path === "string" ? record.path : "";
        if (!alphaAccessEnabled || !isAlphaProtectedPath(pathname)) {
          sendJson(response, 404, { error: { code: "NOT_FOUND" } });
          return;
        }
        const asset = learnerPageAsset(pathname) ?? {
          file: "404.html",
          contentType: "text/html; charset=utf-8",
        };

        const suppliedCode =
          typeof record.code === "string" ? record.code : "";
        const suppliedProof =
          typeof record.proof === "string" ? record.proof : "";
        const expectedProof = alphaProof(alphaAccessCode);
        const granted =
          equalSecret(suppliedCode, alphaAccessCode) ||
          equalSecret(suppliedProof, expectedProof);
        if (!granted) {
          sendJson(response, 401, {
            error: { code: "ALPHA_ACCESS_DENIED" },
          });
          return;
        }

        const content = await readFile(join(clientDirectory, asset.file), "utf8");
        const html =
          asset.file === "index.html"
            ? content.replace(" data-alpha-note hidden", " data-alpha-note")
            : content;
        sendJson(response, 200, {
          granted: true,
          proof: expectedProof,
          html,
        });
      } catch (error) {
        if (error instanceof InvalidMessageRequest) {
          sendJson(response, 400, { error: { code: error.code } });
        } else {
          sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
        }
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/benchmarks") {
      try {
        const fixtures = await loadEvaluationFixtures();
        sendJson(response, 200, {
          sets: benchmarkSetSummaries(fixtures),
        });
      } catch {
        sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/benchmarks/run") {
      try {
        const fixtures = await loadEvaluationFixtures();
        const benchmarkRequest = parseBenchmarkRunRequest(
          await readJson(request),
        );
        const result = benchmarkRequest.developerMode
          ? await processBenchmarkRun(fixtures, evaluationRuntime, {
              ...benchmarkRequest,
              developerMode: true,
            })
          : await processBenchmarkRun(fixtures, evaluationRuntime, {
              ...benchmarkRequest,
              developerMode: false,
            });
        sendJson(response, 200, result);
      } catch (error) {
        if (error instanceof InvalidBenchmarkRequest) {
          sendJson(response, 400, { error: { code: error.code } });
        } else if (error instanceof InvalidMessageRequest) {
          sendJson(response, 400, { error: { code: error.code } });
        } else {
          sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/contact") {
      try {
        const body = await readJson(request);
        const submission = parseContactSubmission(body);
        const ipAddress = request.socket.remoteAddress ?? "unknown";
        const rate = communicationRateLimiter.check("contact", ipAddress);
        response.setHeader("X-RateLimit-Remaining", String(rate.remaining));
        response.setHeader("X-RateLimit-Reset", String(rate.resetAt));
        await processContactSubmission(mailTransport, submission, ipAddress);
        sendJson(response, 200, { ok: true, destination: "contact@alphasynthai.com" });
      } catch (error) {
        if (
          error instanceof InvalidCommunicationRequest ||
          error instanceof InvalidMessageRequest
        ) {
          const status = error.code === "RATE_LIMITED" ? 429 : 400;
          sendJson(response, status, { error: { code: error.code } });
        } else if (error instanceof CommunicationDeliveryFailed) {
          sendJson(response, 503, { error: { code: error.code } });
        } else {
          sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/feedback") {
      try {
        const body = await readJson(request);
        const submission = parseFeedbackSubmission(body);
        const ipAddress = request.socket.remoteAddress ?? "unknown";
        const rate = communicationRateLimiter.check("feedback", ipAddress);
        response.setHeader("X-RateLimit-Remaining", String(rate.remaining));
        response.setHeader("X-RateLimit-Reset", String(rate.resetAt));
        await processFeedbackSubmission(mailTransport, submission, ipAddress);
        sendJson(response, 200, { ok: true, destination: "contact@alphasynthai.com" });
      } catch (error) {
        if (
          error instanceof InvalidCommunicationRequest ||
          error instanceof InvalidMessageRequest
        ) {
          const status = error.code === "RATE_LIMITED" ? 429 : 400;
          sendJson(response, status, { error: { code: error.code } });
        } else if (error instanceof CommunicationDeliveryFailed) {
          sendJson(response, 503, { error: { code: error.code } });
        } else {
          sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/playground") {
      try {
        const body = await readJson(request);
        const message =
          typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "";
        const model = createLocalDemoFakeModel(message, configuredProvider);
        const playgroundResult = await processPlaygroundMessage(model, body, {
          provider: providerMode,
          model: providerModel,
        });
        sendJson(response, 200, playgroundResult);
      } catch (error) {
        if (error instanceof InvalidMessageRequest) {
          sendJson(response, 400, { error: { code: error.code } });
        } else {
          sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/message") {
      try {
        const body = await readJson(request);
        const message =
          typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "";
        const model = createLocalDemoFakeModel(message, configuredProvider);
        const learnerResponse = await processLearnerMessage(model, body);
        sendJson(response, 200, learnerResponseBody(learnerResponse));
      } catch (error) {
        if (error instanceof InvalidMessageRequest) {
          sendJson(response, 400, { error: { code: error.code } });
        } else {
          sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
        }
      }
      return;
    }

    const asset =
      staticFiles.get(url.pathname) ??
      (isCurriculumLessonPath(url.pathname)
        ? lessonAsset
        : undefined);
    if (
      request.method === "GET" &&
      alphaAccessEnabled &&
      isAlphaProtectedPath(url.pathname)
    ) {
      try {
        await sendClientAsset(response, {
          file: "alpha-access.html",
          contentType: "text/html; charset=utf-8",
        });
      } catch {
        sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
      }
      return;
    }
    if (request.method === "GET" && asset === undefined) {
      if (url.pathname.startsWith("/api/")) {
        sendJson(response, 404, { error: { code: "NOT_FOUND" } });
        return;
      }
      try {
        await sendClientAsset(
          response,
          { file: "404.html", contentType: "text/html; charset=utf-8" },
          404,
          false,
          url.pathname,
        );
      } catch {
        sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
      }
      return;
    }
    if (request.method !== "GET" || asset === undefined) {
      sendJson(response, 404, { error: { code: "NOT_FOUND" } });
      return;
    }

    try {
      await sendClientAsset(
        response,
        asset,
        200,
        alphaAccessEnabled && url.pathname === "/",
        url.pathname,
      );
    } catch {
      sendJson(response, 500, { error: { code: "LOCAL_SERVER_ERROR" } });
    }
  });
}

const launchedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url).toLowerCase() ===
    resolve(process.argv[1]).toLowerCase();

if (launchedDirectly) {
  const port = Number(process.env.PORT ?? defaultPort);
  createLocalStewardServer().listen(port, host, () => {
    console.log(`Steward local UI: http://${host}:${port}`);
  });
}
