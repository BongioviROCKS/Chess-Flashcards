// scripts/ensure-stockfish.js
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "engines");

const platform = process.platform;
const arch = process.arch;

const engineFilename =
  platform === "win32" ? "stockfish.exe" : "stockfish";

const enginePath = path.join(ENGINES_DIR, engineFilename);

function getAssetUrl() {
  const base = process.env.STOCKFISH_ASSET_BASE_URL; 
  if (!base) return null;

  let name;
  if (platform === "win32" && arch === "x64") name = "stockfish-win32-x64.zip";
  else if (platform === "darwin" && arch === "arm64") name = "stockfish-darwin-arm64.zip";
  else if (platform === "darwin" && arch === "x64") name = "stockfish-darwin-x64.zip";
  else if (platform === "linux" && arch === "x64") name = "stockfish-linux-x64.zip";
  else if (platform === "linux" && arch === "arm64") name = "stockfish-linux-arm64.zip";
  else return null;

  return `${base}/${name}`;
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        // Follow redirects (GitHub releases often redirect)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return resolve(download(res.headers.location, dest));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        try { fs.unlinkSync(dest); } catch {}
        reject(err);
      });
  });
}

function unzip(zipPath, outDir) {
  ensureDir(outDir);

  // Prefer system unzip when available.
  // Windows: use PowerShell Expand-Archive
  if (platform === "win32") {
    const ps = `powershell -NoProfile -Command "Expand-Archive -Force \\"${zipPath}\\" \\"${outDir}\\""`;
    execSync(ps, { stdio: "inherit" });
    return;
  }

  // macOS/Linux: unzip
  execSync(`unzip -o "${zipPath}" -d "${outDir}"`, { stdio: "inherit" });
}

function chmodExecutable(p) {
  if (platform === "win32") return;
  execSync(`chmod +x "${p}"`, { stdio: "inherit" });
}

function findEngineBinary(dir) {
  // If your zip contains the binary at root, this is enough.
  const direct = path.join(dir, engineFilename);
  if (fileExists(direct)) return direct;

  // Otherwise, search one level deep.
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const nested = path.join(dir, e.name, engineFilename);
      if (fileExists(nested)) return nested;
    }
  }
  return null;
}

async function main() {
  if (fileExists(enginePath)) {
    console.log(`[stockfish] OK: ${path.relative(ROOT, enginePath)}`);
    return;
  }

  ensureDir(ENGINES_DIR);

  const url = getAssetUrl();
  if (!url) {
    console.warn(`[stockfish] Missing engine and no download URL configured.`);
    console.warn(`Set STOCKFISH_ASSET_BASE_URL to a release folder containing per-platform zips.`);
    console.warn(`Example: STOCKFISH_ASSET_BASE_URL="https://github.com/<you>/<repo>/releases/download/stockfish-v16.1"`);
    process.exit(1);
  }

  console.log(`[stockfish] Downloading from ${url}`);

  const tmpZip = path.join(os.tmpdir(), `stockfish-${platform}-${arch}-${Date.now()}.zip`);
  const tmpOut = path.join(os.tmpdir(), `stockfish-${platform}-${arch}-${Date.now()}`);

  await download(url, tmpZip);
  unzip(tmpZip, tmpOut);

  const found = findEngineBinary(tmpOut);
  if (!found) {
    console.error(`[stockfish] Downloaded zip did not contain ${engineFilename}`);
    process.exit(1);
  }

  // Move to your canonical path: ./engines/stockfish(.exe)
  fs.copyFileSync(found, enginePath);
  chmodExecutable(enginePath);

  console.log(`[stockfish] Installed: ${path.relative(ROOT, enginePath)}`);
}

main().catch((err) => {
  console.error(`[stockfish] ERROR: ${err.message}`);
  process.exit(1);
});