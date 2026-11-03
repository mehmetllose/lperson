const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

if (h.includes('class="adv-page-actions" id="adv-add-btn-container"')) {
  console.log("HTML already updated");
  process.exit(0);
}

const oldHtml2 =
  "            <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;\">\n" +
  "              <div>\n" +
  "                <div class=\"month-title\" id=\"adv-month-title\">—</div>\n" +
  "              </div>\n" +
  "              <div style=\"display:flex;gap:8px;\">\n" +
  "                <button class=\"btn btn-secondary btn-sm\" onclick=\"changeAdvMonth(-1)\">◀</button>\n" +
  "                <button class=\"btn btn-secondary btn-sm\" onclick=\"changeAdvMonth(1)\">▶</button>\n" +
  "                <span id=\"adv-add-btn-container\"></span>\n" +
  "              </div>\n" +
  "            </div>";

const newHtml =
  "            <div class=\"month-nav adv-page-header\">\n" +
  "              <button type=\"button\" class=\"btn btn-secondary btn-sm month-nav-btn\" onclick=\"changeAdvMonth(-1)\" aria-label=\"Önceki ay\">\n" +
  "                <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polyline points=\"15 18 9 12 15 6\"/></svg>\n" +
  "              </button>\n" +
  "              <div style=\"text-align:center;flex:1;min-width:0;padding:0 8px;\">\n" +
  "                <div class=\"month-title adv-month-title-plain\" id=\"adv-month-title\">—</div>\n" +
  "              </div>\n" +
  "              <button type=\"button\" class=\"btn btn-secondary btn-sm month-nav-btn\" onclick=\"changeAdvMonth(1)\" aria-label=\"Sonraki ay\">\n" +
  "                <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polyline points=\"9 18 15 12 9 6\"/></svg>\n" +
  "              </button>\n" +
  "            </div>\n" +
  "            <div class=\"adv-page-actions\" id=\"adv-add-btn-container\"></div>";

if (!h.includes(oldHtml2)) {
  console.error("old block not found");
  process.exit(1);
}
h = h.replace(oldHtml2, newHtml);
fs.writeFileSync(p, h);
console.log("replaced ok");
