import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "ct-owner-build.owner.js");
const dest = path.join(root, "public", "ct-owner-build.js");
fs.copyFileSync(src, dest);
console.log("Owner APK bayrağı etkin: public/ct-owner-build.js");
