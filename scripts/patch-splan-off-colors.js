const fs = require("fs");
const path = "c:/Users/PC/Desktop/yv/public/index.html";
let s = fs.readFileSync(path, "utf8");
const oldBlock = `          } else if (isOff) {
            cellBg = "rgba(245,166,35,0.08)";
            cellBorder = "rgba(245,166,35,0.35)";
            if (assignedTpl && assignedTpl.startTime) {
              const tc = tplColor(assignedTpl);
              const statusDot = isWorking ? \`<span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;margin-right:3px;"></span>\` : hasDone ? \`<span style="width:6px;height:6px;border-radius:50%;background:var(--text4);display:inline-block;margin-right:3px;"></span>\` : "";
              cellContent = \`<span style="font-size:10px;font-weight:700;color:\${tc};">\${statusDot}\${escHtml(assignedTpl.name)}</span>
                <div style="font-size:9px;color:var(--text3);margin-top:2px;">\${assignedTpl.startTime||""}\${assignedTpl.endTime?"–"+assignedTpl.endTime:""}</div>\${rateChip}\`;
            } else {
              cellContent = \`<span style="font-size:10px;color:var(--accent);font-weight:700;">Hafta Tatili</span>\${rateChip}\`;
            }`;
const newBlock = `          } else if (isOff) {
            cellBg = "rgba(251, 146, 60, 0.18)";
            cellBorder = "rgba(251, 146, 60, 0.55)";
            if (assignedTpl && assignedTpl.startTime) {
              const tc = tplColor(assignedTpl);
              const statusDot = isWorking ? \`<span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;margin-right:3px;"></span>\` : hasDone ? \`<span style="width:6px;height:6px;border-radius:50%;background:var(--text4);display:inline-block;margin-right:3px;"></span>\` : "";
              cellContent = \`<span style="font-size:9px;font-weight:800;color:#fb923c;display:block;margin-bottom:2px;">Hafta Tatili</span>
                <span style="font-size:10px;font-weight:700;color:\${tc};">\${statusDot}\${escHtml(assignedTpl.name)}</span>
                <div style="font-size:9px;color:#fdba74;margin-top:2px;">\${assignedTpl.startTime||""}\${assignedTpl.endTime?"–"+assignedTpl.endTime:""}</motion.div>\${rateChip}\`;
            } else {
              cellContent = \`<span style="font-size:10px;font-weight:800;color:#fb923c;">Hafta Tatili</span>\${rateChip}\`;
            }`;
const fixedNew = newBlock.replace("</motion.div>", "</div>");
if (!s.includes(oldBlock)) {
  console.error("not found");
  process.exit(1);
}
s = s.replace(oldBlock, fixedNew);
fs.writeFileSync(path, s);
console.log("ok");
