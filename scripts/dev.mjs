import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const nextDir = join(projectRoot, ".next");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function collectManifestAssets(manifest) {
  if (!manifest || typeof manifest !== "object" || !manifest.pages) {
    return [];
  }

  return Object.values(manifest.pages)
    .flat()
    .filter((asset) => typeof asset === "string" && asset.startsWith("static/"));
}

function hasStaleNextAssets() {
  const appBuildManifest = readJson(join(nextDir, "app-build-manifest.json"));
  const buildManifest = readJson(join(nextDir, "build-manifest.json"));
  const assets = [
    ...collectManifestAssets(appBuildManifest),
    ...((buildManifest?.rootMainFiles || []).filter((asset) => typeof asset === "string"))
  ];

  return assets.some((asset) => !existsSync(join(nextDir, asset)));
}

if (existsSync(nextDir) && hasStaleNextAssets()) {
  console.warn("Detected stale Next.js dev assets. Cleaning .next before starting dev server.");
  rmSync(nextDir, { recursive: true, force: true });
}

const nextBin = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
