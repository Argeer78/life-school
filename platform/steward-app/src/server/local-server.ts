import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { GenerationProvider } from "../provider/contract.js";
import { createConfiguredGenerationProvider } from "../provider/openai/config.js";
import { createLocalDemoFakeModel } from "./local-demo-model.js";
import {
  InvalidMessageRequest,
  learnerResponseBody,
  maximumMessageLength,
  processLearnerMessage,
} from "./message-api.js";

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
  const configuredProvider =
    "generationProvider" in options
      ? (options.generationProvider ?? null)
      : createConfiguredGenerationProvider(options.environment ?? process.env);
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${host}`);

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
