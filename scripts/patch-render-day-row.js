const fs = require("fs");
const p = "c:/Users/PC/Desktop/yv/public/index.html";
let h = fs.readFileSync(p, "utf8");
const start = h.indexOf("      let contentHtml = \"\";\n      if (isWeeklyOff) {");
const end = h.indexOf("      // Status badge HTML", start);
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}
const block = `      let leaveFloatHtml = "";
      if (isWeeklyOff && !lt) {
        leaveFloatHtml += \`<span class="leave-badge" style="background:#fb923c18;border:1px solid #fb923c44;color:#fb923c;display:inline-flex;"><span style="width:5px;height:5px;border-radius:50%;background:#fb923c;flex-shrink:0;"></span>Haftalık İzin</span>\`;
      }
      if (lt) {
        leaveFloatHtml += \`<span class="leave-badge" style="background:\${lt.color}18;border:1px solid \${lt.color}44;color:\${lt.color};display:inline-flex;"><span style="width:5px;height:5px;border-radius:50%;background:\${lt.color};flex-shrink:0;"></span>\${lt.label}</span>\`;
      }

      let contentHtml = "";
      if (filledShifts.length) {
        contentHtml += \`<span class="day-content-times">\${formatShiftTimesHtml(filledShifts)}</span>\`;
        if (planHrRow) {
          contentHtml += \` <span style="font-size:9px;color:#a78bfa;background:#a78bfa18;border:1px solid #a78bfa33;border-radius:4px;padding:1px 5px;">\${escHtml(planHrRow.label||"Plan ücreti")}: \${cur}\${planHrRow.rate}/s</span>\`;
        }
        if (rec.note) contentHtml += \`<div style="font-size:10px;color:var(--text2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escHtml(rec.note)}</div>\`;
      } else if (lt) {
        contentHtml += \`<span style="font-size:12px;color:var(--text3);font-style:italic;">İzinli</span>\`;
        if (rec.note) contentHtml += \`<div style="font-size:10px;color:var(--text3);margin-top:2px;">\${escHtml(rec.note)}</motion.div>\`;
      } else if (dayStatus && dayStatus.status === "missing") {
        contentHtml += \`<span style="font-size:11px;color:#ff7070;font-weight:700;">⚠ Eksik Kayıt</span>\`;
      } else if (!isWeeklyOff) {
        contentHtml += \`<span style="font-size:11px;color:var(--text3);font-style:italic;">Kayıt yok</span>\`;
      }

`;
let fixed = block.replace(/<\/motion\.div>/g, "</div>");
h = h.slice(0, start) + fixed + h.slice(end);
h = h.replace(
  "    <div class=\"day-divider\"></motion.div>\n    <div class=\"day-content\">${contentHtml}</div>",
  "    <div class=\"day-divider\"></div>\n    ${leaveFloatHtml ? `<div class=\"day-row-leave-float\">${leaveFloatHtml}</div>` : \"\"}\n    <div class=\"day-content\">${contentHtml}</div>"
);
h = h.replace(
  "    <div class=\"day-divider\"></div>\n    <div class=\"day-content\">${contentHtml}</div>",
  "    <div class=\"day-divider\"></div>\n    ${leaveFloatHtml ? `<div class=\"day-row-leave-float\">${leaveFloatHtml}</div>` : \"\"}\n    <div class=\"day-content\">${contentHtml}</div>"
);
h = h.replace(
  /      let rightHtml = "";\n      if \(lt\) \{\n        rightHtml = `[^`]+`;\n      \} else if \(hours > 0\) \{/,
  "      let rightHtml = \"\";\n      if (hours > 0) {"
);
fs.writeFileSync(p, h);
console.log("ok");
