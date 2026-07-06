import { createLocalStewardServer } from "./local-server.js";

const defaultProductionHost = "0.0.0.0";
const defaultProductionPort = 3000;

function productionPort(value: string | undefined): number {
  const port =
    value === undefined || value.trim() === ""
      ? defaultProductionPort
      : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError("PORT must be an integer from 1 through 65535.");
  }
  return port;
}

const host = process.env.HOST?.trim() || defaultProductionHost;
const port = productionPort(process.env.PORT);

createLocalStewardServer().listen(port, host, () => {
  console.log(`Steward production server listening on ${host}:${port}`);
});
