import { readFile } from "node:fs/promises";
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

const host = "127.0.0.1";
const defaultPort = 4173;
const clientDirectory = join(dirname(fileURLToPath(import.meta.url)), "../client");

const staticFiles = new Map([
  ["/", { file: "index.html", contentType: "text/html; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", contentType: "text/css; charset=utf-8" }],
  ["/app.js", { file: "app.js", contentType: "text/javascript; charset=utf-8" }],
  [
    "/learner-response.js",
    { file: "learner-response.js", contentType: "text/javascript; charset=utf-8" },
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
]);

function securityHeaders(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
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

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maximumMessageLength + 1_000) {
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
}

export function createLocalStewardServer(
  options: LocalStewardServerOptions = {},
) {
  const environment = options.environment ?? process.env;
  const configuredProvider =
    "generationProvider" in options
      ? (options.generationProvider ?? null)
      : createConfiguredGenerationProvider(environment);
  const providerMode =
    "generationProvider" in options
      ? configuredProvider === null
        ? "fake"
        : "injected"
      : configuredProviderMode(environment);
  const providerModel =
    providerMode === "openai"
      ? environment.OPENAI_MODEL?.trim() || defaultOpenAIModel
      : providerMode === "fake"
        ? "local-demo"
        : "configured-provider";
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

    const asset = staticFiles.get(url.pathname);
    if (request.method !== "GET" || asset === undefined) {
      sendJson(response, 404, { error: { code: "NOT_FOUND" } });
      return;
    }

    try {
      const content = await readFile(join(clientDirectory, asset.file));
      securityHeaders(response);
      response.statusCode = 200;
      response.setHeader("Content-Type", asset.contentType);
      response.end(content);
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
