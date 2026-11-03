const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
if (h.includes("onclick=\"clearWorkerNotifications()\"")) {
  console.log("already has button");
  process.exit(0);
}
const old =
  '<motion.div class="page" id="page-worker-notifications">\n            <div class="section-hd" style="margin-bottom:12px;">Bildirimler</div>';
const neu =
  '<div class="page" id="page-worker-notifications">\n            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">\n              <div class="section-hd" style="margin:0;">Bildirimler</div>\n              <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Bildirimleri sıfırla</button>\n            </div>';
if (!h.includes('<div class="page" id="page-worker-notifications">')) {
  console.error("page not found");
  process.exit(1);
}
h = h.replace(
  '<div class="page" id="page-worker-notifications">\n            <div class="section-hd" style="margin-bottom:12px;">Bildirimler</div>',
  '<div class="page" id="page-worker-notifications">\n            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">\n              <div class="section-hd" style="margin:0;">Bildirimler</div>\n              <button type="button" class="btn btn-secondary btn-sm" onclick="clearWorkerNotifications()">Bildirimleri sıfırla</button>\n            </div>'
);
fs.writeFileSync(p, h);
console.log("fixed", h.includes("clearWorkerNotifications()"));
