import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "vendor");
const outfile = join(outDir, "cap-plugins.bundle.js");

mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src", "cap-plugins-entry.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  outfile,
  logLevel: "info",
});

console.log("Wrote", outfile);

const qrOut = join(outDir, "qrcode.bundle.js");
await esbuild.build({
  entryPoints: [join(root, "scripts", "qrcode-cap-entry.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2018"],
  outfile: qrOut,
  logLevel: "info",
});

console.log("Wrote", qrOut);
