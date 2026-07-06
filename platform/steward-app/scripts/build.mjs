import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = join(projectRoot, "dist");
const clientSourceDirectory = join(projectRoot, "src", "client");
const clientOutputDirectory = join(outputDirectory, "client");
const typeScriptCompiler = createRequire(import.meta.url).resolve(
  "typescript/bin/tsc",
);

await rm(outputDirectory, { force: true, recursive: true });

const compilation = spawnSync(
  process.execPath,
  [typeScriptCompiler, "-p", "tsconfig.build.json"],
  { cwd: projectRoot, stdio: "inherit" },
);
if (compilation.status !== 0) {
  process.exit(compilation.status ?? 1);
}

await mkdir(clientOutputDirectory, { recursive: true });
const clientAssets = await readdir(clientSourceDirectory, {
  withFileTypes: true,
});
for (const asset of clientAssets) {
  if (
    asset.isFile() &&
    (asset.name.endsWith(".html") || asset.name.endsWith(".css"))
  ) {
    await copyFile(
      join(clientSourceDirectory, asset.name),
      join(clientOutputDirectory, asset.name),
    );
  }
}
