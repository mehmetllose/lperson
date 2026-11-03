const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");

h = h.replace(
  /<span style="font-size:11px;color:var\(--text3\);width:100%;">Hızlı uzat:<\/span>\s*<button type="button" class="btn btn-secondary btn-sm" onclick="platformAddSubscriptionDays\(this,7\)">\+7 gün<\/button>\s*<button type="button" class="btn btn-secondary btn-sm" onclick="platformAddSubscriptionDays\(this,30\)">\+30 gün<\/button>\s*<button type="button" class="btn btn-secondary btn-sm" onclick="platformAddSubscriptionDays\(this,365\)">\+365 gün<\/button>\s*/,
  '<span style="font-size:10px;color:var(--text3);">Uzat:</span> '
);
h = h.replace(
  /<span style="font-size:11px;color:var\(--text3\);width:100%;margin-top:4px;">Hızlı kısalt:<\/span>\s*<button type="button" class="btn btn-secondary btn-sm" onclick="platformSubtractSubscriptionDays\(this,7\)">−7 gün<\/button>\s*<button type="button" class="btn btn-secondary btn-sm" onclick="platformSubtractSubscriptionDays\(this,30\)">−30 gün<\/button>\s*/,
  '<span style="font-size:10px;color:var(--text3);margin-left:6px;">Kısalt:</span> '
);

if (!h.includes("pa-auto-block-")) {
  h = h.replace(
    "<span>Patron ayarlarda kalan günü görsün</span>\n            </motion.div>\n          </motion.div>\n          <div class=\"field\" style=\"margin-bottom:8px;\">",
    "<span>Patron ayarlarda kalan günü görsün</span>\n            </div>\n            <div style=\"display:flex;align-items:center;gap:10px;\">\n              <div id=\"pa-auto-block-${sid}\" class=\"wsp-switch ${autoBlock ? \"on\" : \"\"}\" onclick=\"paToggleSubSwitch('${enc}','autoblock')\" style=\"cursor:pointer;flex-shrink:0;\" title=\"Aç / kapat\"><div class=\"wsp-switch-knob\"></div></div>\n              <span>Süre dolunca otomatik erişimi sonlandır</span>\n            </div>\n          </div>\n          <div class=\"field\" style=\"margin-bottom:8px;\">"
  );
  if (!h.includes("pa-auto-block-")) {
    h = h.replace(
      "<span>Patron ayarlarda kalan günü görsün</span>\n            </div>\n          </div>\n          <div class=\"field\" style=\"margin-bottom:8px;\">",
      "<span>Patron ayarlarda kalan günü görsün</span>\n            </div>\n            <div style=\"display:flex;align-items:center;gap:10px;\">\n              <motion.div id=\"pa-auto-block-${sid}\" class=\"wsp-switch ${autoBlock ? \"on\" : \"\"}\" onclick=\"paToggleSubSwitch('${enc}','autoblock')\" style=\"cursor:pointer;flex-shrink:0;\" title=\"Aç / kapat\"><div class=\"wsp-switch-knob\"></div></div>\n              <span>Süre dolunca otomatik erişimi sonlandır</span>\n            </div>\n          </div>\n          <div class=\"field\" style=\"margin-bottom:8px;\">"
    );
  }
}

h = h.replace(
  /return `<div class="card pa-comp-row" style="margin-bottom:8px;padding:8px 10px;border:1px solid \$\{blocked \? "var\(--red\)" : "var\(--border\)"\};border-radius:8px;" data-pa-cid="\$\{enc\}">/,
  'return `<div class="card pa-comp-row" style="border:1px solid ${blocked ? "var(--red)" : "var(--border)"};" data-pa-cid="${enc}">'
);

h = h.split("motion.div").join("div");

fs.writeFileSync(p, h);
console.log("pa-ui", { autoBlock: h.includes("pa-auto-block-"), noQuick7: !h.includes("+7 gün") });
