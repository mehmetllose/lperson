const fs = require("fs");
const path = "c:/Users/PC/Desktop/yv/public/index.html";
let s = fs.readFileSync(path, "utf8");

if (!s.includes("shiftStatusKind = getWorkerTodayStatusKind(u.id)")) {
  s = s.replace(
    "        let shiftHtml = \"\";\n        if (tpl && tpl.startTime) {",
    "        const shiftStatusKind = getWorkerTodayStatusKind(u.id);\n        let shiftHtml = \"\";\n        if (tpl && tpl.startTime) {"
  );
}

const boxOld = `            <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,166,35,0.1);display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>`;

const boxNew = `            <motion.div class="lp-status-anim-wrap" style="width:44px;height:40px;padding:4px;box-sizing:border-box;color:\${shiftStatusKind === "working" ? "var(--accent)" : shiftStatusKind === "rest" ? "var(--green)" : "#7eb6ff"};">
              \${workerStatusAnimHtml(shiftStatusKind === "idle" ? "planned" : shiftStatusKind, "md") || workerStatusAnimHtml("planned", "md")}
            </div>`.replace(/<motion\.motion.div/g, "<div").replace(/<\/motion\.div>/g, "</div>").replace(/<motion\.div/g, "<div");

if (s.includes(boxOld)) {
  s = s.replace(boxOld, boxNew);
  fs.writeFileSync(path, s);
  console.log("ok");
} else if (s.includes("shiftStatusKind === \"working\" ? \"var(--accent)\"")) {
  console.log("already patched box");
} else {
  console.error("box not found");
  process.exit(1);
}
