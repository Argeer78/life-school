import express from "express";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalStewardServer } from "./platform/steward-app/dist/server/local-server.js";

const appRoot = dirname(fileURLToPath(import.meta.url));
const productionEnvPath = resolve(appRoot, "platform/steward-app/.env");

// Load production defaults without overriding environment variables from the host.
if (existsSync(productionEnvPath)) {
  loadEnvFile(productionEnvPath);
}

console.info("[production:env:init]", {
  envFilePath: productionEnvPath,
  envFileExists: existsSync(productionEnvPath),
  stewardProvider: process.env.STEWARD_PROVIDER?.trim() || "",
  openAIModel: process.env.OPENAI_MODEL?.trim() || "",
  hasOpenAIApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
});

const defaultHost = "0.0.0.0";
const defaultPort = 3000;
const portValue = process.env.PORT?.trim();
const port =
  portValue === undefined || portValue === ""
    ? defaultPort
    : Number(portValue);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new TypeError("PORT must be an integer from 1 through 65535.");
}

const stewardServer = createLocalStewardServer();
const requestHandler = stewardServer.listeners("request")[0];
if (typeof requestHandler !== "function") {
  throw new TypeError("Steward production request handler is unavailable.");
}

const app = express();
app.use((request, response) => {
  requestHandler.call(stewardServer, request, response);
});

const host = process.env.HOST?.trim() || defaultHost;
app.listen(port, host, () => {
  console.log(`Lifeschool production server listening on ${host}:${port}`);
});
