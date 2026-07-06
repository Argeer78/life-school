import express from "express";
import { createLocalStewardServer } from "./platform/steward-app/dist/server/local-server.js";

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
