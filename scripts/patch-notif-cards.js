const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
const marker = "blocks.push(arr.map(it => `";
const i = h.indexOf(marker, h.indexOf("renderWorkerNotificationsPage"));
if (i < 0) {
  console.error("marker not found");
  process.exit(1);
}
const endStr = "`).join(\"\"));";
const e = h.indexOf(endStr, i);
if (e < 0) {
  console.error("end not found");
  process.exit(1);
}
const replacement = `blocks.push(arr.map(it => {
          const m = workerNotifKindMeta(it.kind);
          return \`<div class="wnotif-card \${m.cls}">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="font-size:20px;line-height:1;flex-shrink:0;">\${m.icon}</span>
              <motion.div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                  <span style="font-size:13px;font-weight:800;color:var(--text);">\${escHtml(it.title || "Bildirim")}</span>
                  <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:999px;background:\${m.color}22;color:\${m.color};border:1px solid \${m.color}44;">\${m.label}</span>
                </div>
                <div style="font-size:12px;color:var(--text2);line-height:1.5;">\${escHtml(it.body || "")}</div>
                <div style="font-size:10px;color:var(--text4);margin-top:8px;">\${new Date(it.t || Date.now()).toLocaleString("tr-TR")}</div>
              </div>
            </div>
          </div>\`;
        }).join(""));`;
const clean = replacement.replace(/<motion\.div/g, "<div").replace(/<\/motion\.div>/g, "</div>");
h = h.slice(0, i) + clean + h.slice(e + endStr.length);
fs.writeFileSync(p, h);
console.log("patched ok");
